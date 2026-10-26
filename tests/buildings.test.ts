import {
  BUILDING_DEFINITIONS,
  START_HOUSES,
  getBuildingDefinition,
} from "../src/sim/buildingConstants";
import {
  BUILDING_TYPES,
  advanceConstruction,
  isFinished,
  type Building,
  type BuildingType,
} from "../src/sim/buildings";
import { orderBuilding, type OrderResult } from "../src/sim/commands";
import { GOODS } from "../src/sim/goods";
import { createInitialState, tick, type GameState } from "../src/sim/state";
import { INITIAL_STORAGE } from "../src/sim/storageConstants";
import { HOURS_PER_DAY } from "../src/sim/timeConstants";

const SEED = 42;

function tickTimes(state: GameState, count: number): GameState {
  let current = state;
  for (let i = 0; i < count; i++) {
    current = tick(current);
  }
  return current;
}

/** Orders a building and fails the test if the order is refused. */
function mustOrder(state: GameState, type: BuildingType): GameState {
  const result = orderBuilding(state, type);
  if (!result.ok) {
    throw new Error(`order of ${type} refused: ${result.reason}`);
  }
  return result.state;
}

function withWoodAndStone(state: GameState, wood: number, stone: number): GameState {
  return { ...state, storage: { ...state.storage, wood, stone } };
}

function buildingById(state: GameState, id: number): Building {
  const building = state.buildings.find((b) => b.id === id);
  if (!building) {
    throw new Error(`no building ${id}`);
  }
  return building;
}

describe("building types", () => {
  it("lists the six start building types without mine and smithy", () => {
    expect(BUILDING_TYPES).toEqual(["house", "well", "field", "mill", "bakery", "woodcutterHut"]);
    expect(BUILDING_TYPES).not.toContain("mine");
    expect(BUILDING_TYPES).not.toContain("smithy");
  });

  it("has exactly one definition per type", () => {
    expect(Object.keys(BUILDING_DEFINITIONS).sort()).toEqual([...BUILDING_TYPES].sort());
  });

  it("pins the start balance table", () => {
    expect(BUILDING_DEFINITIONS).toEqual({
      house: { cost: { wood: 20, stone: 0 }, buildHours: 48, workplaces: 0, beds: 4 },
      well: { cost: { wood: 10, stone: 0 }, buildHours: 24, workplaces: 2, beds: 0 },
      field: { cost: { wood: 5, stone: 0 }, buildHours: 12, workplaces: 4, beds: 0 },
      mill: { cost: { wood: 15, stone: 8 }, buildHours: 72, workplaces: 2, beds: 0 },
      bakery: { cost: { wood: 15, stone: 8 }, buildHours: 72, workplaces: 2, beds: 0 },
      woodcutterHut: { cost: { wood: 10, stone: 0 }, buildHours: 24, workplaces: 2, beds: 0 },
    });
  });

  it("gives every definition exactly the four fields", () => {
    for (const type of BUILDING_TYPES) {
      const definition = BUILDING_DEFINITIONS[type];
      expect(Object.keys(definition).sort()).toEqual(["beds", "buildHours", "cost", "workplaces"]);
      expect(Object.keys(definition.cost).sort()).toEqual(["stone", "wood"]);
    }
  });

  it("uses non-negative integers everywhere and at least 1 build hour", () => {
    for (const type of BUILDING_TYPES) {
      const { cost, buildHours, workplaces, beds } = BUILDING_DEFINITIONS[type];
      for (const value of [cost.wood, cost.stone, buildHours, workplaces, beds]) {
        expect(Number.isInteger(value)).toBe(true);
        expect(value).toBeGreaterThanOrEqual(0);
      }
      expect(buildHours).toBeGreaterThanOrEqual(1);
    }
  });

  it("lets the starting stone pay for one mill and one bakery (needed for castle level 2)", () => {
    const stone = BUILDING_DEFINITIONS.mill.cost.stone + BUILDING_DEFINITIONS.bakery.cost.stone;
    expect(stone).toBeLessThanOrEqual(INITIAL_STORAGE.stone);
  });

  it("freezes the definitions, each definition and each cost", () => {
    expect(Object.isFrozen(BUILDING_DEFINITIONS)).toBe(true);
    for (const type of BUILDING_TYPES) {
      expect(Object.isFrozen(BUILDING_DEFINITIONS[type])).toBe(true);
      expect(Object.isFrozen(BUILDING_DEFINITIONS[type].cost)).toBe(true);
    }
    expect(() => {
      (BUILDING_DEFINITIONS.mill.cost as { stone: number }).stone = 0;
    }).toThrow();
    expect(BUILDING_DEFINITIONS.mill.cost.stone).toBe(8);
  });

  it("returns the definition of a type from getBuildingDefinition", () => {
    for (const type of BUILDING_TYPES) {
      expect(getBuildingDefinition(type)).toBe(BUILDING_DEFINITIONS[type]);
    }
  });
});

describe("isFinished", () => {
  it("is true exactly when hoursLeft is 0", () => {
    expect(isFinished({ id: 1, type: "house", hoursLeft: 0 })).toBe(true);
    expect(isFinished({ id: 1, type: "house", hoursLeft: 1 })).toBe(false);
    expect(isFinished({ id: 1, type: "mill", hoursLeft: 72 })).toBe(false);
  });
});

describe("buildings in the initial state", () => {
  it("starts with START_HOUSES finished houses and nextBuildingId 3", () => {
    const state = createInitialState(SEED);
    expect(START_HOUSES).toBe(2);
    expect(state.buildings).toEqual([
      { id: 1, type: "house", hoursLeft: 0 },
      { id: 2, type: "house", hoursLeft: 0 },
    ]);
    expect(state.buildings).toHaveLength(START_HOUSES);
    expect(state.nextBuildingId).toBe(START_HOUSES + 1);
    expect(state.buildings.every(isFinished)).toBe(true);
  });

  it("gives every building exactly the fields id, type and hoursLeft", () => {
    for (const building of createInitialState(SEED).buildings) {
      expect(Object.keys(building).sort()).toEqual(["hoursLeft", "id", "type"]);
    }
  });

  it("does not charge for the starting houses", () => {
    expect(createInitialState(SEED).storage).toEqual(INITIAL_STORAGE);
  });

  it("does not change rngState or residents (pinned values from before this job)", () => {
    // Same values as pinned in tests/needs.test.ts before buildings existed.
    expect(createInitialState(0).rngState).toBe(1007906552);
    expect(createInitialState(-1).rngState).toBe(1007906551);
    for (const seed of [SEED, 0, -1]) {
      const state = createInitialState(seed);
      expect(state.residents).toHaveLength(8);
      expect(state.nextResidentId).toBe(9);
    }
  });

  it("returns fresh building objects on every call", () => {
    const a = createInitialState(SEED);
    const b = createInitialState(SEED);
    expect(a.buildings).not.toBe(b.buildings);
    a.buildings[0]!.hoursLeft = 99;
    a.buildings[1]!.type = "mill";
    a.buildings.push({ id: 3, type: "well", hoursLeft: 1 });
    expect(b.buildings).toEqual([
      { id: 1, type: "house", hoursLeft: 0 },
      { id: 2, type: "house", hoursLeft: 0 },
    ]);
    expect(createInitialState(SEED).buildings).toEqual(b.buildings);
    expect(BUILDING_DEFINITIONS.house.buildHours).toBe(48);
  });
});

describe("orderBuilding", () => {
  it("pays the cost, appends the building and raises nextBuildingId", () => {
    const state = createInitialState(SEED);
    for (const type of BUILDING_TYPES) {
      const { cost, buildHours } = BUILDING_DEFINITIONS[type];
      const result = orderBuilding(state, type);
      expect(result.ok).toBe(true);
      if (!result.ok) continue;
      const next = result.state;
      expect(next.storage).toEqual({
        ...state.storage,
        wood: state.storage.wood - cost.wood,
        stone: state.storage.stone - cost.stone,
      });
      expect(next.buildings).toEqual([...state.buildings, { id: state.nextBuildingId, type, hoursLeft: buildHours }]);
      expect(next.nextBuildingId).toBe(state.nextBuildingId + 1);
      expect(next.elapsedHours).toBe(state.elapsedHours);
      expect(next.rngState).toBe(state.rngState);
      expect(next.residents).toEqual(state.residents);
      expect(next.nextResidentId).toBe(state.nextResidentId);
    }
  });

  it("changes no good other than wood and stone", () => {
    const state = createInitialState(SEED);
    const next = mustOrder(state, "mill");
    for (const good of GOODS) {
      if (good !== "wood" && good !== "stone") {
        expect(next.storage[good]).toBe(state.storage[good]);
      }
    }
  });

  it("accepts exactly enough goods and leaves 0 wood and 0 stone", () => {
    const { wood, stone } = BUILDING_DEFINITIONS.mill.cost;
    const next = mustOrder(withWoodAndStone(createInitialState(SEED), wood, stone), "mill");
    expect(next.storage.wood).toBe(0);
    expect(next.storage.stone).toBe(0);
  });

  it("refuses when wood is short, even with enough stone", () => {
    const { wood, stone } = BUILDING_DEFINITIONS.mill.cost;
    const state = withWoodAndStone(createInitialState(SEED), wood - 1, stone + 100);
    const before = structuredClone(state);
    const result: OrderResult = orderBuilding(state, "mill");
    expect(result).toEqual({ ok: false, reason: "notEnoughGoods" });
    expect(state).toEqual(before);
  });

  it("refuses when stone is short, even with enough wood", () => {
    const { wood, stone } = BUILDING_DEFINITIONS.bakery.cost;
    const state = withWoodAndStone(createInitialState(SEED), wood + 100, stone - 1);
    expect(orderBuilding(state, "bakery")).toEqual({ ok: false, reason: "notEnoughGoods" });
  });

  it("orders a building without stone cost with 0 stone in storage", () => {
    expect(BUILDING_DEFINITIONS.field.cost.stone).toBe(0);
    const state = withWoodAndStone(createInitialState(SEED), BUILDING_DEFINITIONS.field.cost.wood, 0);
    const next = mustOrder(state, "field");
    expect(next.storage.wood).toBe(0);
    expect(next.storage.stone).toBe(0);
  });

  it("gives two orders in a row the ids 3 and 4", () => {
    const next = mustOrder(mustOrder(createInitialState(SEED), "field"), "field");
    expect(next.buildings.map((b) => b.id)).toEqual([1, 2, 3, 4]);
    expect(next.nextBuildingId).toBe(5);
  });

  it("orders a mill, then a bakery, then refuses a second mill", () => {
    const initial = createInitialState(SEED);
    const afterBakery = mustOrder(mustOrder(initial, "mill"), "bakery");
    const { mill, bakery } = BUILDING_DEFINITIONS;
    expect(afterBakery.storage.wood).toBe(INITIAL_STORAGE.wood - mill.cost.wood - bakery.cost.wood);
    expect(afterBakery.storage.stone).toBe(INITIAL_STORAGE.stone - mill.cost.stone - bakery.cost.stone);
    // With the start table: 50 - 15 - 15 = 20 wood, 20 - 8 - 8 = 4 stone.
    expect(afterBakery.storage.wood).toBe(20);
    expect(afterBakery.storage.stone).toBe(4);
    const before = structuredClone(afterBakery);
    expect(orderBuilding(afterBakery, "mill")).toEqual({ ok: false, reason: "notEnoughGoods" });
    expect(afterBakery).toEqual(before);
  });

  it("allows many buildings of one type under construction at once", () => {
    let state = withWoodAndStone(createInitialState(SEED), 1000, 1000);
    for (let i = 0; i < 5; i++) {
      state = mustOrder(state, "house");
    }
    expect(state.buildings.filter((b) => b.type === "house")).toHaveLength(START_HOUSES + 5);
    expect(state.buildings.filter((b) => !isFinished(b))).toHaveLength(5);
  });

  it("never lets storage go below 0 when ordering until refused", () => {
    let state = createInitialState(SEED);
    for (;;) {
      const result = orderBuilding(state, "woodcutterHut");
      if (!result.ok) break;
      state = result.state;
      expect(state.storage.wood).toBeGreaterThanOrEqual(0);
      expect(state.storage.stone).toBeGreaterThanOrEqual(0);
    }
    expect(state.storage.wood).toBeLessThan(BUILDING_DEFINITIONS.woodcutterHut.cost.wood);
  });

  it("works on a state with elapsedHours not 0", () => {
    const state = tickTimes(createInitialState(SEED), 37);
    const next = mustOrder(state, "well");
    expect(next.elapsedHours).toBe(37);
    expect(next.buildings.at(-1)).toEqual({ id: 3, type: "well", hoursLeft: BUILDING_DEFINITIONS.well.buildHours });
    // Finished after exactly buildHours more ticks, wherever it was ordered.
    const hours = BUILDING_DEFINITIONS.well.buildHours;
    expect(buildingById(tickTimes(next, hours - 1), 3).hoursLeft).toBe(1);
    expect(buildingById(tickTimes(next, hours), 3).hoursLeft).toBe(0);
  });

  it("does not mutate its input and is deterministic", () => {
    const state = mustOrder(tickTimes(createInitialState(SEED), 5), "field");
    const before = structuredClone(state);
    const a = orderBuilding(state, "mill");
    const b = orderBuilding(state, "mill");
    expect(state).toEqual(before);
    expect(a).toEqual(b);
    const refused = withWoodAndStone(state, 0, 0);
    const refusedBefore = structuredClone(refused);
    orderBuilding(refused, "mill");
    expect(refused).toEqual(refusedBefore);
  });
});

describe("construction over time", () => {
  it("lowers hoursLeft of every unfinished building by 1 per tick, in parallel", () => {
    const state = mustOrder(mustOrder(createInitialState(SEED), "field"), "mill");
    const next = tick(state);
    expect(next.buildings).toEqual([
      { id: 1, type: "house", hoursLeft: 0 },
      { id: 2, type: "house", hoursLeft: 0 },
      { id: 3, type: "field", hoursLeft: BUILDING_DEFINITIONS.field.buildHours - 1 },
      { id: 4, type: "mill", hoursLeft: BUILDING_DEFINITIONS.mill.buildHours - 1 },
    ]);
  });

  it("finishes a field on tick 12 and a mill on tick 72", () => {
    const ordered = mustOrder(mustOrder(createInitialState(SEED), "field"), "mill");
    expect(BUILDING_DEFINITIONS.field.buildHours).toBe(12);
    expect(BUILDING_DEFINITIONS.mill.buildHours).toBe(72);
    expect(buildingById(tickTimes(ordered, 11), 3).hoursLeft).toBe(1);
    expect(isFinished(buildingById(tickTimes(ordered, 12), 3))).toBe(true);
    expect(isFinished(buildingById(tickTimes(ordered, 12), 4))).toBe(false);
    expect(buildingById(tickTimes(ordered, 71), 4).hoursLeft).toBe(1);
    expect(isFinished(buildingById(tickTimes(ordered, 72), 4))).toBe(true);
  });

  it("finishes every type after exactly buildHours ticks and keeps it at 0", () => {
    for (const type of BUILDING_TYPES) {
      const hours = BUILDING_DEFINITIONS[type].buildHours;
      const ordered = mustOrder(createInitialState(SEED), type);
      expect(buildingById(tickTimes(ordered, hours - 1), 3).hoursLeft).toBe(1);
      expect(buildingById(tickTimes(ordered, hours), 3).hoursLeft).toBe(0);
      expect(buildingById(tickTimes(ordered, hours + 50), 3).hoursLeft).toBe(0);
    }
  });

  it("never makes hoursLeft negative over many ticks and keeps order and ids", () => {
    let state = withWoodAndStone(createInitialState(SEED), 1000, 1000);
    for (const type of BUILDING_TYPES) {
      state = mustOrder(state, type);
    }
    const ids = state.buildings.map((b) => [b.id, b.type]);
    for (let i = 0; i < 200; i++) {
      state = tick(state);
      for (const building of state.buildings) {
        expect(Number.isInteger(building.hoursLeft)).toBe(true);
        expect(building.hoursLeft).toBeGreaterThanOrEqual(0);
      }
      expect(state.buildings.map((b) => [b.id, b.type])).toEqual(ids);
    }
    expect(state.buildings.every(isFinished)).toBe(true);
  });

  it("finishes buildings ordered at different hours on their own ticks", () => {
    const withField = mustOrder(createInitialState(SEED), "field");
    const withWell = mustOrder(tickTimes(withField, 5), "well");
    // The field (12 h) finishes 12 ticks after its order, the well (24 h) 24 ticks after its order.
    expect(isFinished(buildingById(tickTimes(withWell, 6), 3))).toBe(false);
    expect(isFinished(buildingById(tickTimes(withWell, 7), 3))).toBe(true);
    expect(buildingById(tickTimes(withWell, 23), 4).hoursLeft).toBe(1);
    expect(isFinished(buildingById(tickTimes(withWell, 24), 4))).toBe(true);
  });

  it("does not touch storage, residents, rngState, nextResidentId or nextBuildingId outside midnight", () => {
    let state = mustOrder(createInitialState(SEED), "mill");
    for (let i = 0; i < 100; i++) {
      const next = tick(state);
      if (next.elapsedHours % HOURS_PER_DAY !== 0) {
        expect(next.storage).toEqual(state.storage);
        expect(next.residents).toEqual(state.residents);
      }
      expect(next.rngState).toBe(state.rngState);
      expect(next.nextResidentId).toBe(state.nextResidentId);
      expect(next.nextBuildingId).toBe(state.nextBuildingId);
      state = next;
    }
  });

  it("keeps daily consumption the same and finishes a building on a midnight tick", () => {
    // A well ordered at hour 0 is finished on tick 24, the first midnight.
    expect(BUILDING_DEFINITIONS.well.buildHours).toBe(HOURS_PER_DAY);
    // Wish numbers at 0, so the finished well stays empty and only consumption shows.
    const plain: GameState = {
      ...createInitialState(SEED),
      jobTargets: { waterCarrier: 0, farmer: 0, miller: 0, baker: 0, woodcutter: 0 },
    };
    const ordered = mustOrder(plain, "well");
    const plainLater = tickTimes(plain, HOURS_PER_DAY);
    const orderedLater = tickTimes(ordered, HOURS_PER_DAY);
    expect(isFinished(buildingById(orderedLater, 3))).toBe(true);
    expect(buildingById(tickTimes(ordered, HOURS_PER_DAY - 1), 3).hoursLeft).toBe(1);
    // Eating happened on the same tick with the same result; only the paid wood differs.
    expect(orderedLater.residents).toEqual(plainLater.residents);
    expect(orderedLater.storage).toEqual({
      ...plainLater.storage,
      wood: plainLater.storage.wood - BUILDING_DEFINITIONS.well.cost.wood,
    });
    expect(plainLater.storage.bread).toBeLessThan(INITIAL_STORAGE.bread);
    // Over many days the food outcome stays identical.
    const plainRun = tickTimes(plain, 30 * HOURS_PER_DAY);
    const orderedRun = tickTimes(ordered, 30 * HOURS_PER_DAY);
    expect(orderedRun.residents).toEqual(plainRun.residents);
    expect(orderedRun.storage.bread).toBe(plainRun.storage.bread);
    expect(orderedRun.storage.water).toBe(plainRun.storage.water);
  });

  it("advanceConstruction returns a new array and does not mutate its input", () => {
    const buildings: Building[] = [
      { id: 1, type: "house", hoursLeft: 0 },
      { id: 2, type: "well", hoursLeft: 3 },
    ];
    const before = structuredClone(buildings);
    const next = advanceConstruction(buildings);
    expect(buildings).toEqual(before);
    expect(next).not.toBe(buildings);
    expect(next).toEqual([
      { id: 1, type: "house", hoursLeft: 0 },
      { id: 2, type: "well", hoursLeft: 2 },
    ]);
  });
});

describe("purity and plain data with buildings", () => {
  it("tick does not mutate the state, its buildings or any building", () => {
    let state = mustOrder(mustOrder(createInitialState(SEED), "field"), "mill");
    for (let i = 0; i < 80; i++) {
      const before = structuredClone(state);
      const next = tick(state);
      expect(state).toEqual(before);
      expect(tick(state)).toEqual(next);
      state = next;
    }
  });

  it("survives a JSON round trip initially, after an order, during and after construction", () => {
    const roundTrip = (s: GameState): unknown => JSON.parse(JSON.stringify(s));
    const initial = createInitialState(SEED);
    const ordered = mustOrder(initial, "mill");
    for (const state of [initial, ordered, tickTimes(ordered, 10), tickTimes(ordered, 72), tickTimes(ordered, 100)]) {
      expect(roundTrip(state)).toStrictEqual(state);
    }
  });

  it("does not change the constants when a game's building is changed", () => {
    const state = mustOrder(createInitialState(SEED), "mill");
    state.buildings[2]!.hoursLeft = 1;
    expect(BUILDING_DEFINITIONS.mill.buildHours).toBe(72);
    expect(mustOrder(createInitialState(SEED), "mill").buildings[2]!.hoursLeft).toBe(72);
  });
});
