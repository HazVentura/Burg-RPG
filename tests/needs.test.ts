import { GOODS, type Storage } from "../src/sim/goods";
import {
  BREAD_PER_RESIDENT_PER_DAY,
  NEED_DROP_PER_DAY_WITHOUT,
  NEED_MAX,
  NEED_MIN,
  WATER_PER_RESIDENT_PER_DAY,
} from "../src/sim/needConstants";
import { consumeDailyFood, type Needs } from "../src/sim/needs";
import type { Resident } from "../src/sim/residents";
import { createInitialState, tick, type GameState } from "../src/sim/state";
import { INITIAL_STORAGE } from "../src/sim/storageConstants";
import { HOURS_PER_DAY, HOURS_PER_YEAR } from "../src/sim/timeConstants";

const SEED = 42;

function tickTimes(state: GameState, count: number): GameState {
  let current = state;
  for (let i = 0; i < count; i++) {
    current = tick(current);
  }
  return current;
}

function makeResident(id: number, needs: Needs): Resident {
  return { id, name: `R${id}`, sex: id % 2 === 1 ? "female" : "male", bornAtHour: -5 * HOURS_PER_YEAR, partnerId: null, needs, workplaceId: null, pinnedJob: null };
}

function makeStorage(bread: number, water: number): Storage {
  return { ...INITIAL_STORAGE, bread, water };
}

/** A hand-made state at hour 23, so the next tick is a consumption tick. */
function stateBeforeMidnight(residents: Resident[], storage: Storage): GameState {
  return {
    elapsedHours: HOURS_PER_DAY - 1,
    rngState: 123,
    storage,
    residents,
    nextResidentId: 100,
    buildings: [],
    nextBuildingId: 1,
    jobTargets: { waterCarrier: 0, farmer: 0, miller: 0, baker: 0, woodcutter: 0 },

    chronicle: [],
    nextChronicleId: 0,
  };
}

const breadNeeds = (state: { residents: readonly Resident[] }) => state.residents.map((r) => r.needs.bread);
const waterNeeds = (state: { residents: readonly Resident[] }) => state.residents.map((r) => r.needs.water);

describe("need constants", () => {
  it("has the agreed values", () => {
    expect(NEED_MIN).toBe(0);
    expect(NEED_MAX).toBe(100);
    expect(BREAD_PER_RESIDENT_PER_DAY).toBe(1);
    expect(WATER_PER_RESIDENT_PER_DAY).toBe(1);
    expect(NEED_DROP_PER_DAY_WITHOUT).toBe(15);
  });
});

describe("starting needs", () => {
  it("gives every settler full bread and water, and no other need", () => {
    for (const seed of [SEED, 0, -1]) {
      for (const resident of createInitialState(seed).residents) {
        expect(resident.needs).toStrictEqual({ bread: NEED_MAX, water: NEED_MAX });
      }
    }
  });

  it("gives each resident its own needs object", () => {
    const a = createInitialState(SEED);
    const b = createInitialState(SEED);
    const first = a.residents[0];
    const second = a.residents[1];
    if (!first || !second) throw new Error("no residents");
    expect(first.needs).not.toBe(second.needs);
    first.needs.bread = 10;
    first.needs.water = 20;
    expect(second.needs).toEqual({ bread: NEED_MAX, water: NEED_MAX });
    expect(b.residents[0]?.needs).toEqual({ bread: NEED_MAX, water: NEED_MAX });
    expect(createInitialState(SEED).residents[0]?.needs).toEqual({ bread: NEED_MAX, water: NEED_MAX });
  });

  it("keeps rngState, names, ages and partners exactly as before needs existed", () => {
    // Values recorded from main before this job (seed 42).
    const state = createInitialState(SEED);
    expect(state.rngState).toBe(1007906594);
    expect(state.residents.map(({ needs: _needs, workplaceId: _workplaceId, pinnedJob: _pinnedJob, ...rest }) => rest)).toEqual([
      { id: 1, name: "Mechthild", sex: "female", bornAtHour: -7536, partnerId: 2 },
      { id: 2, name: "Rudolf", sex: "male", bornAtHour: -6264, partnerId: 1 },
      { id: 3, name: "Gertrud", sex: "female", bornAtHour: -8496, partnerId: 4 },
      { id: 4, name: "Hugo", sex: "male", bornAtHour: -6600, partnerId: 3 },
      { id: 5, name: "Richardis", sex: "female", bornAtHour: -5928, partnerId: 6 },
      { id: 6, name: "Leopold", sex: "male", bornAtHour: -9216, partnerId: 5 },
      { id: 7, name: "Adelheid", sex: "female", bornAtHour: -7512, partnerId: 8 },
      { id: 8, name: "Arnold", sex: "male", bornAtHour: -7704, partnerId: 7 },
    ]);
    expect(createInitialState(0).rngState).toBe(1007906552);
    expect(createInitialState(-1).rngState).toBe(1007906551);
  });

  it("adds no top-level field to GameState beyond the buildings, jobTargets and chronicle fields", () => {
    expect(Object.keys(createInitialState(SEED)).sort()).toEqual([
      "buildings",
      "chronicle",
      "elapsedHours",
      "jobTargets",
      "nextBuildingId",
      "nextChronicleId",
      "nextResidentId",
      "residents",
      "rngState",
      "storage",
    ]);
  });
});

describe("timing of daily consumption", () => {
  it("changes nothing in the first 23 ticks", () => {
    const initial = createInitialState(SEED);
    let current = initial;
    for (let i = 1; i < HOURS_PER_DAY; i++) {
      current = tick(current);
      expect(current.storage).toEqual(initial.storage);
      expect(current.residents).toEqual(initial.residents);
    }
  });

  it("consumes one day on tick 24", () => {
    const state = tickTimes(createInitialState(SEED), HOURS_PER_DAY);
    const count = state.residents.length;
    expect(state.storage.bread).toBe(INITIAL_STORAGE.bread - count * BREAD_PER_RESIDENT_PER_DAY);
    expect(state.storage.water).toBe(INITIAL_STORAGE.water - count * WATER_PER_RESIDENT_PER_DAY);
  });

  it("changes nothing on ticks 25 to 47", () => {
    const day1 = tickTimes(createInitialState(SEED), HOURS_PER_DAY);
    let current = day1;
    for (let i = 1; i < HOURS_PER_DAY; i++) {
      current = tick(current);
      expect(current.storage).toEqual(day1.storage);
      expect(current.residents).toEqual(day1.residents);
    }
    expect(tick(current).storage.bread).toBe(day1.storage.bread - day1.residents.length * BREAD_PER_RESIDENT_PER_DAY);
  });

  it("consumes exactly 40 days in one year", () => {
    // One resident with plenty of food: bread use counts the days.
    const resident = makeResident(1, { bread: NEED_MAX, water: NEED_MAX });
    const start: GameState = { ...stateBeforeMidnight([resident], makeStorage(1000, 1000)), elapsedHours: 0 };
    const later = tickTimes(start, HOURS_PER_YEAR);
    expect(1000 - later.storage.bread).toBe(40 * BREAD_PER_RESIDENT_PER_DAY);
    expect(1000 - later.storage.water).toBe(40 * WATER_PER_RESIDENT_PER_DAY);
  });
});

describe("consumeDailyFood", () => {
  it("feeds everyone when there is enough and changes no other good", () => {
    const residents = [makeResident(1, { bread: 50, water: 25 }), makeResident(2, { bread: NEED_MAX, water: 0 })];
    const storage = makeStorage(10, 10);
    const result = consumeDailyFood(residents, storage);
    expect(result.storage).toEqual({ ...storage, bread: 10 - 2 * BREAD_PER_RESIDENT_PER_DAY, water: 10 - 2 * WATER_PER_RESIDENT_PER_DAY });
    expect(breadNeeds(result)).toEqual([NEED_MAX, NEED_MAX]);
    // A resident at 25 or 0 who gets fed goes straight back to full.
    expect(waterNeeds(result)).toEqual([NEED_MAX, NEED_MAX]);
  });

  it("handles bread and water independently", () => {
    const residents = [makeResident(1, { bread: NEED_MAX, water: NEED_MAX })];
    const noWater = consumeDailyFood(residents, makeStorage(5, 0));
    expect(noWater.storage.bread).toBe(5 - BREAD_PER_RESIDENT_PER_DAY);
    expect(noWater.storage.water).toBe(0);
    expect(noWater.residents[0]?.needs).toEqual({ bread: NEED_MAX, water: NEED_MAX - NEED_DROP_PER_DAY_WITHOUT });

    const noBread = consumeDailyFood(residents, makeStorage(0, 5));
    expect(noBread.storage.bread).toBe(0);
    expect(noBread.storage.water).toBe(5 - WATER_PER_RESIDENT_PER_DAY);
    expect(noBread.residents[0]?.needs).toEqual({ bread: NEED_MAX - NEED_DROP_PER_DAY_WITHOUT, water: NEED_MAX });
  });

  it("serves list order on ties: 3 bread for 8 full residents", () => {
    const residents = Array.from({ length: 8 }, (_, i) => makeResident(i + 1, { bread: NEED_MAX, water: NEED_MAX }));
    const result = consumeDailyFood(residents, makeStorage(3, 100));
    const drop = NEED_MAX - NEED_DROP_PER_DAY_WITHOUT;
    expect(breadNeeds(result)).toEqual([NEED_MAX, NEED_MAX, NEED_MAX, drop, drop, drop, drop, drop]);
    expect(result.storage.bread).toBe(0);
  });

  it("serves the lowest need first when one ration is left for two", () => {
    const residents = [makeResident(1, { bread: 75, water: 50 }), makeResident(2, { bread: 50, water: 75 })];
    const result = consumeDailyFood(residents, makeStorage(1, 1));
    // Bread goes to resident 2, water to resident 1: the order is worked out per good.
    expect(breadNeeds(result)).toEqual([75 - NEED_DROP_PER_DAY_WITHOUT, NEED_MAX]);
    expect(waterNeeds(result)).toEqual([NEED_MAX, 75 - NEED_DROP_PER_DAY_WITHOUT]);
    expect(result.storage.bread).toBe(0);
    expect(result.storage.water).toBe(0);
  });

  it("never splits a ration or goes below 0", () => {
    const residents = [makeResident(1, { bread: NEED_MAX, water: NEED_MAX })];
    const result = consumeDailyFood(residents, makeStorage(0.5, 0));
    expect(result.storage.bread).toBe(0.5);
    expect(result.storage.water).toBe(0);
    expect(result.residents[0]?.needs).toEqual({
      bread: NEED_MAX - NEED_DROP_PER_DAY_WITHOUT,
      water: NEED_MAX - NEED_DROP_PER_DAY_WITHOUT,
    });
  });

  it("drops an unfed need by 15 a day down to 0 and keeps it there", () => {
    let residents = [makeResident(1, { bread: NEED_MAX, water: NEED_MAX })];
    const seen: number[] = [];
    for (let day = 0; day < 8; day++) {
      const result = consumeDailyFood(residents, makeStorage(100, 0));
      residents = result.residents;
      seen.push(residents[0]?.needs.water ?? -1);
    }
    expect(seen).toEqual([85, 70, 55, 40, 25, 10, 0, 0]);
  });

  it("clamps at NEED_MIN when a need is below the drop", () => {
    const result = consumeDailyFood([makeResident(1, { bread: 10, water: NEED_MIN })], makeStorage(0, 0));
    expect(result.residents[0]?.needs).toEqual({ bread: NEED_MIN, water: NEED_MIN });
  });

  it("leaves the storage unchanged for an empty resident list", () => {
    const storage = makeStorage(7, 3);
    const result = consumeDailyFood([], storage);
    expect(result.residents).toEqual([]);
    expect(result.storage).toEqual(storage);
  });

  it("keeps resident order and every other resident field", () => {
    const residents = [makeResident(3, { bread: 0, water: 100 }), makeResident(1, { bread: 50, water: 0 })];
    const result = consumeDailyFood(residents, makeStorage(1, 1));
    expect(result.residents.map((r) => r.id)).toEqual([3, 1]);
    expect(result.residents.map(({ needs: _needs, ...rest }) => rest)).toEqual(
      residents.map(({ needs: _needs, ...rest }) => rest),
    );
  });

  it("does not mutate its inputs", () => {
    const residents = [makeResident(1, { bread: 50, water: 50 }), makeResident(2, { bread: 25, water: 0 })];
    const storage = makeStorage(1, 0);
    const before = structuredClone({ residents, storage });
    const result = consumeDailyFood(residents, storage);
    expect({ residents, storage }).toEqual(before);
    expect(result.storage).not.toBe(storage);
    expect(result.residents[0]?.needs).not.toBe(residents[0]?.needs);
  });
});

describe("daily consumption through tick", () => {
  it("applies to a hand-made single resident at midnight", () => {
    const state = stateBeforeMidnight([makeResident(1, { bread: 10, water: 25 })], makeStorage(0, 1));
    const next = tick(state);
    expect(next.elapsedHours).toBe(HOURS_PER_DAY);
    expect(next.residents[0]?.needs).toEqual({ bread: NEED_MIN, water: NEED_MAX });
    expect(next.storage).toEqual(makeStorage(0, 0));
  });

  it("leaves the storage unchanged with no residents", () => {
    const state = stateBeforeMidnight([], makeStorage(5, 5));
    expect(tick(state).storage).toEqual(state.storage);
    expect(tickTimes(state, 10 * HOURS_PER_DAY).storage).toEqual(state.storage);
  });
});

describe("start values outcome", () => {
  // Pins the numbers on purpose: 8 residents, 60 bread, 40 water, 1 ration each, drop 15.
  it("after 5 days: 20 bread, 0 water, every need 100", () => {
    const state = tickTimes(createInitialState(SEED), 120);
    expect(state.storage.bread).toBe(20);
    expect(state.storage.water).toBe(0);
    expect(breadNeeds(state)).toEqual(Array(8).fill(100));
    expect(waterNeeds(state)).toEqual(Array(8).fill(100));
  });

  it("after 6 days: 12 bread, 0 water, bread 100, water 85", () => {
    const state = tickTimes(createInitialState(SEED), 144);
    expect(state.storage.bread).toBe(12);
    expect(state.storage.water).toBe(0);
    expect(breadNeeds(state)).toEqual(Array(8).fill(100));
    expect(waterNeeds(state)).toEqual(Array(8).fill(85));
  });

  it("after 8 days: 0 bread, residents 1 to 4 at bread 100, 5 to 8 at 85, water 55", () => {
    const state = tickTimes(createInitialState(SEED), 192);
    expect(state.storage.bread).toBe(0);
    expect(state.storage.water).toBe(0);
    expect(breadNeeds(state)).toEqual([100, 100, 100, 100, 85, 85, 85, 85]);
    expect(waterNeeds(state)).toEqual(Array(8).fill(55));
  });
});

describe("purity, determinism, plain data", () => {
  it("never mutates the input over 960 ticks, consumption ticks included", () => {
    let current = createInitialState(SEED);
    for (let i = 0; i < HOURS_PER_YEAR; i++) {
      const before = structuredClone(current);
      const next = tick(current);
      expect(current).toEqual(before);
      expect(next.rngState).toBe(before.rngState);
      expect(next.nextResidentId).toBe(before.nextResidentId);
      current = next;
    }
  });

  it("gives deep-equal results for the same state on a consumption tick", () => {
    const state = tickTimes(createInitialState(SEED), 7 * HOURS_PER_DAY - 1);
    expect(tick(state)).toEqual(tick(state));
  });

  it("survives a JSON round trip with needs in range", () => {
    for (const count of [0, 24, 120, 960]) {
      const state = tickTimes(createInitialState(SEED), count);
      expect(JSON.parse(JSON.stringify(state))).toStrictEqual(state);
      for (const resident of state.residents) {
        for (const value of [resident.needs.bread, resident.needs.water]) {
          expect(Number.isFinite(value)).toBe(true);
          expect(value).toBeGreaterThanOrEqual(NEED_MIN);
          expect(value).toBeLessThanOrEqual(NEED_MAX);
        }
      }
      for (const good of GOODS) {
        expect(Number.isFinite(state.storage[good])).toBe(true);
        expect(state.storage[good]).toBeGreaterThanOrEqual(0);
      }
    }
  });
});
