import { GIVEN_NAMES } from "../src/sim/names";
import { NEED_MAX } from "../src/sim/needConstants";
import { createRandom } from "../src/sim/random";
import { START_AGE_MAX_YEARS, START_AGE_MIN_YEARS, START_COUPLES } from "../src/sim/residentConstants";
import { getAgeYears, SEXES, type Resident } from "../src/sim/residents";
import { createInitialState, tick, type GameState } from "../src/sim/state";
import {
  DAYS_PER_SEASON,
  DAYS_PER_YEAR,
  HOURS_PER_DAY,
  HOURS_PER_YEAR,
  SEASONS_PER_YEAR,
} from "../src/sim/timeConstants";

const SEED = 42;
const MANY_SEEDS = Array.from({ length: 200 }, (_, i) => i);

function tickTimes(state: GameState, count: number): GameState {
  let current = state;
  for (let i = 0; i < count; i++) {
    current = tick(current);
  }
  return current;
}

function partnerOf(state: GameState, resident: Resident): Resident | undefined {
  return state.residents.find((other) => other.id === resident.partnerId);
}

describe("resident constants", () => {
  it("has the sexes female and male", () => {
    expect(SEXES).toEqual(["female", "male"]);
  });

  it("derives HOURS_PER_YEAR as 960 from the calendar constants", () => {
    expect(DAYS_PER_YEAR).toBe(DAYS_PER_SEASON * SEASONS_PER_YEAR);
    expect(HOURS_PER_YEAR).toBe(HOURS_PER_DAY * DAYS_PER_SEASON * SEASONS_PER_YEAR);
    expect(HOURS_PER_YEAR).toBe(960);
  });

  it("starts with 4 couples aged 5 to 10 years", () => {
    expect(START_COUPLES).toBe(4);
    expect(START_AGE_MIN_YEARS).toBe(5);
    expect(START_AGE_MAX_YEARS).toBe(10);
  });
});

describe("getAgeYears", () => {
  const resident: Resident = {
    id: 1,
    name: "Adelheid",
    sex: "female",
    bornAtHour: -5 * HOURS_PER_YEAR,
    partnerId: null,
    needs: { bread: NEED_MAX, water: NEED_MAX },
  };

  it("counts completed game years", () => {
    expect(getAgeYears(resident, 0)).toBe(5);
    expect(getAgeYears(resident, 959)).toBe(5);
    expect(getAgeYears(resident, 960)).toBe(6);
  });

  it("gives age 0 for a resident born now, and 1 after one year", () => {
    const newborn: Resident = { ...resident, bornAtHour: 100 };
    expect(getAgeYears(newborn, 100)).toBe(0);
    expect(getAgeYears(newborn, 100 + HOURS_PER_YEAR - 1)).toBe(0);
    expect(getAgeYears(newborn, 100 + HOURS_PER_YEAR)).toBe(1);
  });
});

describe("starting settlers", () => {
  it("creates 8 residents with ids 1 to 8 and nextResidentId 9", () => {
    const state = createInitialState(SEED);
    expect(state.residents).toHaveLength(START_COUPLES * 2);
    expect(state.residents.map((resident) => resident.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(state.nextResidentId).toBe(9);
  });

  it("has exactly these fields on every resident", () => {
    for (const resident of createInitialState(SEED).residents) {
      expect(Object.keys(resident).sort()).toEqual(["bornAtHour", "id", "name", "needs", "partnerId", "sex"]);
    }
  });

  it("lists couples next to each other, female first, partnered with each other", () => {
    for (const seed of [SEED, 0, -1]) {
      const residents = createInitialState(seed).residents;
      for (let i = 0; i < residents.length; i += 2) {
        const female = residents[i];
        const male = residents[i + 1];
        expect(female?.sex).toBe("female");
        expect(male?.sex).toBe("male");
        expect(female?.partnerId).toBe(male?.id);
        expect(male?.partnerId).toBe(female?.id);
      }
    }
  });

  it("gives every resident a partner other than itself, symmetrically", () => {
    const state = createInitialState(SEED);
    for (const resident of state.residents) {
      expect(resident.partnerId).not.toBeNull();
      expect(resident.partnerId).not.toBe(resident.id);
      const partner = partnerOf(state, resident);
      expect(partner).toBeDefined();
      expect(partner?.partnerId).toBe(resident.id);
      expect(partner?.sex).not.toBe(resident.sex);
    }
  });

  it("has exactly 4 female and 4 male residents", () => {
    const residents = createInitialState(SEED).residents;
    expect(residents.filter((r) => r.sex === "female")).toHaveLength(4);
    expect(residents.filter((r) => r.sex === "male")).toHaveLength(4);
  });

  it("keeps start ages within 5 to 10 years over many seeds, reaching both bounds", () => {
    const ages = new Set<number>();
    for (const seed of MANY_SEEDS) {
      for (const resident of createInitialState(seed).residents) {
        const age = getAgeYears(resident, 0);
        expect(age).toBeGreaterThanOrEqual(START_AGE_MIN_YEARS);
        expect(age).toBeLessThanOrEqual(START_AGE_MAX_YEARS);
        ages.add(age);
      }
    }
    expect(ages.has(START_AGE_MIN_YEARS)).toBe(true);
    expect(ages.has(START_AGE_MAX_YEARS)).toBe(true);
  });

  it("stores bornAtHour as whole days before a whole-year age", () => {
    for (const seed of MANY_SEEDS) {
      for (const resident of createInitialState(seed).residents) {
        expect(Number.isInteger(resident.bornAtHour)).toBe(true);
        expect(resident.bornAtHour).toBeLessThan(0);
        const hoursBeyondAge = -resident.bornAtHour - getAgeYears(resident, 0) * HOURS_PER_YEAR;
        // The birthday offset is 0 to 39 whole days, so the age at hour 0 stays exact.
        expect(hoursBeyondAge % HOURS_PER_DAY).toBe(0);
        expect(hoursBeyondAge / HOURS_PER_DAY).toBeGreaterThanOrEqual(0);
        expect(hoursBeyondAge / HOURS_PER_DAY).toBeLessThanOrEqual(DAYS_PER_YEAR - 1);
      }
    }
  });

  it("spreads birthdays over the year, including both ends of the offset range", () => {
    const offsets = new Set<number>();
    for (const seed of MANY_SEEDS) {
      for (const resident of createInitialState(seed).residents) {
        const hoursBeyondAge = -resident.bornAtHour - getAgeYears(resident, 0) * HOURS_PER_YEAR;
        offsets.add(hoursBeyondAge / HOURS_PER_DAY);
      }
    }
    expect(offsets.has(0)).toBe(true);
    expect(offsets.has(DAYS_PER_YEAR - 1)).toBe(true);
  });

  it("draws partners' ages independently", () => {
    let differentAges = 0;
    for (const seed of MANY_SEEDS) {
      const residents = createInitialState(seed).residents;
      for (let i = 0; i < residents.length; i += 2) {
        const female = residents[i];
        const male = residents[i + 1];
        if (female && male && getAgeYears(female, 0) !== getAgeYears(male, 0)) {
          differentAges++;
        }
      }
    }
    expect(differentAges).toBeGreaterThan(0);
  });

  it("gives 8 different names, each from the list for the resident's sex", () => {
    for (const seed of [SEED, 0, -1, ...MANY_SEEDS]) {
      const residents = createInitialState(seed).residents;
      expect(new Set(residents.map((r) => r.name)).size).toBe(residents.length);
      for (const resident of residents) {
        expect(GIVEN_NAMES[resident.sex]).toContain(resident.name);
      }
    }
  });

  it("reproduces the settlers from the documented draw order", () => {
    // Per couple, female then male; per resident: name, age, birthday offset.
    const random = createRandom(SEED);
    const taken: string[] = [];
    const expected = createInitialState(SEED).residents.map((resident) => {
      const free = GIVEN_NAMES[resident.sex].filter((name) => !taken.includes(name));
      const name = free[Math.floor(random.next() * free.length)];
      if (name === undefined) throw new Error("no name");
      taken.push(name);
      const age = START_AGE_MIN_YEARS + Math.floor(random.next() * (START_AGE_MAX_YEARS - START_AGE_MIN_YEARS + 1));
      const offset = Math.floor(random.next() * DAYS_PER_YEAR);
      return { ...resident, name, bornAtHour: -(age * HOURS_PER_YEAR + offset * HOURS_PER_DAY) };
    });
    expect(createInitialState(SEED).residents).toEqual(expected);
    expect(createInitialState(SEED).rngState).toBe(random.seed);
  });
});

describe("settler determinism and isolation", () => {
  it("gives deep-equal residents for the same seed", () => {
    for (const seed of [SEED, 0, -1]) {
      expect(createInitialState(seed)).toEqual(createInitialState(seed));
    }
  });

  it("gives different name lists across seeds 1 to 20", () => {
    const lists = new Set<string>();
    for (let seed = 1; seed <= 20; seed++) {
      lists.add(createInitialState(seed).residents.map((r) => r.name).join(","));
    }
    expect(lists.size).toBeGreaterThanOrEqual(2);
  });

  it("returns fresh resident objects on each call", () => {
    const a = createInitialState(SEED);
    const b = createInitialState(SEED);
    expect(a.residents).not.toBe(b.residents);
    const first = a.residents[0];
    if (!first) throw new Error("no resident");
    first.name = "Changed";
    first.partnerId = null;
    a.residents.push({ ...first, id: 99 });
    expect(b.residents[0]?.name).not.toBe("Changed");
    expect(b.residents[0]?.partnerId).toBe(2);
    expect(b.residents).toHaveLength(8);
    expect(createInitialState(SEED)).toEqual(b);
  });
});

describe("residents over time", () => {
  it("leaves residents, nextResidentId and rngState unchanged over 960 ticks", () => {
    // Only needs change over time (daily food and drink); everything else about a resident stays.
    const initial = createInitialState(SEED);
    const before = structuredClone(initial);
    const later = tickTimes(initial, HOURS_PER_YEAR);
    const withoutNeeds = (residents: readonly Resident[]) => residents.map(({ needs: _needs, ...rest }) => rest);
    expect(withoutNeeds(later.residents)).toEqual(withoutNeeds(before.residents));
    expect(later.nextResidentId).toBe(before.nextResidentId);
    expect(later.rngState).toBe(before.rngState);
    expect(initial).toEqual(before);
  });

  it("ages every resident by exactly one year over 960 ticks", () => {
    const initial = createInitialState(SEED);
    const later = tickTimes(initial, HOURS_PER_YEAR);
    for (const resident of later.residents) {
      expect(getAgeYears(resident, later.elapsedHours)).toBe(getAgeYears(resident, initial.elapsedHours) + 1);
    }
  });

  it("does not mutate the input state's residents", () => {
    const state = tickTimes(createInitialState(SEED), 5);
    const before = structuredClone(state);
    tick(state);
    expect(state).toEqual(before);
  });

  it("survives a JSON round trip with residents, including partnerId null", () => {
    const state = tickTimes(createInitialState(SEED), 100);
    expect(JSON.parse(JSON.stringify(state))).toStrictEqual(state);
    const single: GameState = {
      ...state,
      residents: state.residents.map((r) => ({ ...r, partnerId: null })),
    };
    const restored = JSON.parse(JSON.stringify(single)) as GameState;
    expect(restored).toStrictEqual(single);
    expect(restored.residents[0]?.partnerId).toBeNull();
  });
});
