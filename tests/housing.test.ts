import { getBuildingDefinition } from "../src/sim/buildingConstants";
import type { Building, BuildingType } from "../src/sim/buildings";
import { assignHomes } from "../src/sim/housing";
import { HOUSING_DROP_PER_DAY_WITHOUT, NEED_MAX, NEED_MIN } from "../src/sim/needConstants";
import { CONSUMED_GOODS, RATION_PER_DAY, createFullNeeds, updateHousingNeed } from "../src/sim/needs";
import type { Resident } from "../src/sim/residents";
import { createInitialState, tick, type GameState } from "../src/sim/state";
import { INITIAL_STORAGE } from "../src/sim/storageConstants";
import { HOURS_PER_DAY, HOURS_PER_YEAR } from "../src/sim/timeConstants";

const SEED = 42;
const BEDS = getBuildingDefinition("house").beds;

function makeResident(id: number, fields: Partial<Resident> = {}): Resident {
  return {
    id,
    name: `R${id}`,
    sex: id % 2 === 1 ? "female" : "male",
    bornAtHour: -25 * HOURS_PER_YEAR,
    partnerId: null,
    needs: createFullNeeds(),
    workplaceId: null,
    pinnedJob: null,
    homeId: null,
    ...fields,
  };
}

function building(id: number, type: BuildingType, hoursLeft = 0): Building {
  return { id, type, hoursLeft };
}

/** A hand-made state with plenty of food, so only Wohnraum can change. */
function makeState(buildings: Building[], residents: Resident[], elapsedHours = 1): GameState {
  return {
    elapsedHours,
    rngState: 123,
    storage: { ...INITIAL_STORAGE, bread: 1000, water: 1000 },
    fieldWheat: 0,
    residents,
    nextResidentId: Math.max(0, ...residents.map((r) => r.id)) + 1,
    buildings,
    nextBuildingId: Math.max(0, ...buildings.map((b) => b.id)) + 1,
    jobTargets: { waterCarrier: 0, farmer: 0, miller: 0, baker: 0, woodcutter: 0 },
    chronicle: [],
    nextChronicleId: 0,
  };
}

function residentsNumbered(count: number, fields: (id: number) => Partial<Resident> = () => ({})): Resident[] {
  return Array.from({ length: count }, (_, index) => makeResident(index + 1, fields(index + 1)));
}

function tickTimes(state: GameState, count: number): GameState {
  let current = state;
  for (let i = 0; i < count; i++) current = tick(current);
  return current;
}

const homes = (state: GameState) => state.residents.map((r) => r.homeId);
const housing = (state: GameState) => state.residents.map((r) => r.needs.housing);

describe("Resident.homeId (AC1)", () => {
  it("is a number or null and survives a JSON round trip", () => {
    const state = assignHomes(makeState([building(1, "house")], residentsNumbered(5)));
    expect(homes(state)).toEqual([1, 1, 1, 1, null]);
    expect(JSON.parse(JSON.stringify(state))).toEqual(state);
  });

  it("adds no field to GameState", () => {
    expect(Object.keys(createInitialState(SEED)).sort()).toEqual([
      "buildings",
      "chronicle",
      "elapsedHours",
      "fieldWheat",
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

describe("assignHomes (AC2)", () => {
  it("houses 8 of 10 residents in 2 finished houses; residents 9 and 10 are homeless", () => {
    const state = assignHomes(makeState([building(1, "house"), building(2, "house")], residentsNumbered(10)));
    expect(homes(state)).toEqual([1, 1, 1, 1, 2, 2, 2, 2, null, null]);
  });

  it("offers getBuildingDefinition('house').beds beds per house", () => {
    expect(BEDS).toBe(4);
    const state = assignHomes(makeState([building(1, "house")], residentsNumbered(BEDS + 1)));
    expect(state.residents.filter((r) => r.homeId === 1)).toHaveLength(BEDS);
  });

  it("gives no beds in a house under construction", () => {
    const state = assignHomes(makeState([building(1, "house", 5)], residentsNumbered(2)));
    expect(homes(state)).toEqual([null, null]);
  });

  it("only gives beds in houses, not in work buildings", () => {
    const state = assignHomes(makeState([building(1, "well"), building(2, "field"), building(3, "house")], residentsNumbered(2)));
    expect(homes(state)).toEqual([3, 3]);
  });

  it("clears an unknown id, a well and an unfinished house, and gives a free bed instead", () => {
    const buildings = [building(1, "house"), building(2, "well"), building(3, "house", 10)];
    const residents = [makeResident(1, { homeId: 99 }), makeResident(2, { homeId: 2 }), makeResident(3, { homeId: 3 })];
    const state = assignHomes(makeState(buildings, residents));
    expect(homes(state)).toEqual([1, 1, 1]);
  });

  it("clears an invalid home to null when no bed is free", () => {
    const buildings = [building(1, "house"), building(2, "well")];
    const residents = [...residentsNumbered(4, () => ({ homeId: 1 })), makeResident(5, { homeId: 2 })];
    const state = assignHomes(makeState(buildings, residents));
    expect(homes(state)).toEqual([1, 1, 1, 1, null]);
  });

  it("keeps a resident in house 2 even when house 1 has a free bed", () => {
    const buildings = [building(1, "house"), building(2, "house")];
    const residents = [makeResident(1, { homeId: 2 }), makeResident(2)];
    const state = assignHomes(makeState(buildings, residents));
    expect(homes(state)).toEqual([2, 1]);
  });

  it("keeps homes in list order and moves the overflow to a free bed elsewhere", () => {
    // Five residents claim house 1: the first four keep it, the fifth moves to house 2.
    const buildings = [building(1, "house"), building(2, "house")];
    const residents = residentsNumbered(5, () => ({ homeId: 1 }));
    const state = assignHomes(makeState(buildings, residents));
    expect(homes(state)).toEqual([1, 1, 1, 1, 2]);
  });

  it("places in state.buildings order, not by id", () => {
    const buildings = [building(5, "house"), building(2, "house")];
    const state = assignHomes(makeState(buildings, residentsNumbered(5)));
    expect(homes(state)).toEqual([5, 5, 5, 5, 2]);
  });

  it("gives children beds like adults, whatever their sex, job or needs", () => {
    const residents = [
      makeResident(1, { bornAtHour: 0 }),
      makeResident(2, { bornAtHour: -3 * HOURS_PER_YEAR, sex: "female" }),
      makeResident(3, { needs: { bread: 0, water: 0, housing: 0 }, workplaceId: 7 }),
    ];
    const state = assignHomes(makeState([building(1, "house")], residents, 5));
    expect(homes(state)).toEqual([1, 1, 1]);
  });

  it("never puts more residents into a house than it has beds", () => {
    const buildings = [building(1, "house"), building(2, "house"), building(3, "house", 3)];
    const residents = residentsNumbered(13, (id) => ({ homeId: id % 2 === 0 ? 1 : 2 }));
    const state = assignHomes(makeState(buildings, residents));
    for (const house of [1, 2]) {
      expect(state.residents.filter((r) => r.homeId === house).length).toBeLessThanOrEqual(BEDS);
    }
    expect(state.residents.filter((r) => r.homeId === null)).toHaveLength(5);
  });

  it("is idempotent", () => {
    const buildings = [building(1, "house"), building(2, "well"), building(3, "house")];
    const residents = residentsNumbered(10, (id) => ({ homeId: [99, 2, 3, 1][id % 4] ?? null }));
    const once = assignHomes(makeState(buildings, residents));
    const twice = assignHomes(once);
    expect(twice).toBe(once);
    expect(twice).toEqual(once);
  });

  it("does not mutate its input, and shares unchanged residents", () => {
    const buildings = [building(1, "house"), building(2, "house")];
    const residents = [makeResident(1, { homeId: 2 }), makeResident(2), makeResident(3, { homeId: 99 })];
    const state = makeState(buildings, residents);
    const before = structuredClone(state);
    const next = assignHomes(state);
    expect(state).toEqual(before);
    expect(next).not.toBe(state);
    expect(next.residents[0]).toBe(state.residents[0]);
    expect(next.residents[1]).not.toBe(state.residents[1]);
    expect(next.residents[1]).toEqual({ ...state.residents[1], homeId: 1 });
    expect(homes(next)).toEqual([2, 1, 1]);
  });

  it("returns the input state itself when nothing changes", () => {
    const state = createInitialState(SEED);
    expect(assignHomes(state)).toBe(state);
  });

  it("only changes homeId", () => {
    const state = makeState([building(1, "house")], residentsNumbered(3));
    const next = assignHomes(state);
    const withoutHome = (s: GameState) => ({ ...s, residents: s.residents.map(({ homeId: _homeId, ...rest }) => rest) });
    expect(withoutHome(next)).toEqual(withoutHome(state));
  });
});

describe("createInitialState gives every settler a bed (AC3)", () => {
  it.each([SEED, 0, -1, 7])("puts residents 1-4 in house 1 and 5-8 in house 2 for seed %i", (seed) => {
    const state = createInitialState(seed);
    expect(state.residents.map((r) => [r.id, r.homeId])).toEqual([
      [1, 1],
      [2, 1],
      [3, 1],
      [4, 1],
      [5, 2],
      [6, 2],
      [7, 2],
      [8, 2],
    ]);
  });

  it("keeps rngState, storage, buildings and jobTargets as before", () => {
    // Values recorded from main before this job (seed 42).
    const state = createInitialState(SEED);
    expect(state.rngState).toBe(1007906594);
    expect(state.storage).toEqual(INITIAL_STORAGE);
    expect(state.buildings).toEqual([building(1, "house"), building(2, "house")]);
  });
});

describe("bed assignment in tick (AC4)", () => {
  it("gives the beds of a house that finishes in a tick by the end of that tick", () => {
    const buildings = [building(1, "house"), building(2, "house"), building(3, "house", 2)];
    const state = assignHomes(makeState(buildings, residentsNumbered(10)));
    expect(homes(state)).toEqual([1, 1, 1, 1, 2, 2, 2, 2, null, null]);
    const stillBuilding = tick(state);
    expect(homes(stillBuilding).slice(8)).toEqual([null, null]);
    const done = tick(stillBuilding);
    expect(done.buildings[2]?.hoursLeft).toBe(0);
    expect(homes(done)).toEqual([1, 1, 1, 1, 2, 2, 2, 2, 3, 3]);
  });

  it("counts residents of a house finished on the step into midnight as housed that night", () => {
    const state = makeState([building(1, "house", 1)], [makeResident(1, { needs: { ...createFullNeeds(), housing: 40 } })], HOURS_PER_DAY - 1);
    const midnight = tick(state);
    expect(midnight.elapsedHours).toBe(HOURS_PER_DAY);
    expect(homes(midnight)).toEqual([1]);
    expect(midnight.residents[0]?.needs.housing).toBe(NEED_MAX);
  });
});

describe("Wohnraum need (AC5, AC6)", () => {
  it("starts full and is not a consumed good", () => {
    expect(createFullNeeds()).toEqual({ bread: NEED_MAX, water: NEED_MAX, housing: NEED_MAX });
    expect(CONSUMED_GOODS).toEqual(["bread", "water"]);
    expect(Object.keys(RATION_PER_DAY)).toEqual(["bread", "water"]);
  });

  it("drops by 15 a night without a bed, the same as food", () => {
    expect(HOUSING_DROP_PER_DAY_WITHOUT).toBe(15);
  });

  it("drops a homeless resident from 100 to 85, 70 and 0 after the seventh midnight", () => {
    let state = makeState([], [makeResident(1)], 0);
    const seen: number[] = [];
    for (let day = 1; day <= 8; day++) {
      state = tickTimes(state, HOURS_PER_DAY);
      seen.push(state.residents[0]?.needs.housing ?? -1);
    }
    expect(seen[0]).toBe(85);
    expect(seen[1]).toBe(70);
    expect(seen[6]).toBe(0);
    expect(seen[7]).toBe(NEED_MIN);
  });

  it("keeps 40 after getting a bed at hour 30 until hour 48, then shows 100", () => {
    // A house finishing at hour 30 for a homeless resident at 40.
    let state = makeState([building(1, "house", 6)], [makeResident(1, { needs: { ...createFullNeeds(), housing: 40 } })], HOURS_PER_DAY);
    state = tickTimes(state, 6);
    expect(state.elapsedHours).toBe(30);
    expect(homes(state)).toEqual([1]);
    expect(state.residents[0]?.needs.housing).toBe(40);
    while (state.elapsedHours < 2 * HOURS_PER_DAY - 1) {
      state = tick(state);
      expect(state.residents[0]?.needs.housing).toBe(40);
    }
    state = tick(state);
    expect(state.elapsedHours).toBe(48);
    expect(state.residents[0]?.needs.housing).toBe(100);
  });

  it("does not change between midnights", () => {
    let state = makeState([], [makeResident(1)], HOURS_PER_DAY);
    for (let hour = 1; hour < HOURS_PER_DAY; hour++) {
      state = tick(state);
      expect(state.residents[0]?.needs.housing).toBe(NEED_MAX);
    }
  });

  it("fills with a bed and clamps at NEED_MIN without one (updateHousingNeed)", () => {
    const residents = [
      makeResident(1, { homeId: 1, needs: { ...createFullNeeds(), housing: 0 } }),
      makeResident(2, { needs: { ...createFullNeeds(), housing: 10 } }),
      makeResident(3, { needs: { ...createFullNeeds(), housing: 16 } }),
    ];
    const before = structuredClone(residents);
    const next = updateHousingNeed(residents);
    expect(next.map((r) => r.needs.housing)).toEqual([NEED_MAX, NEED_MIN, 1]);
    expect(next.map((r) => [r.needs.bread, r.needs.water])).toEqual(residents.map((r) => [r.needs.bread, r.needs.water]));
    expect(residents).toEqual(before);
  });

  it("keeps bread and water working as before for a housed resident", () => {
    const state = makeState([building(1, "house")], [makeResident(1, { needs: { bread: 10, water: 25, housing: 50 } })], HOURS_PER_DAY - 1);
    const next = tick({ ...state, storage: { ...state.storage, bread: 0, water: 1 } });
    expect(next.residents[0]?.needs).toEqual({ bread: NEED_MIN, water: NEED_MAX, housing: NEED_MAX });
  });

  it("keeps every starting settler at 100 Wohnraum over the first days", () => {
    const state = tickTimes(createInitialState(SEED), 3 * HOURS_PER_DAY);
    expect(housing(state)).toEqual(Array(8).fill(NEED_MAX));
  });
});
