import { BUILDING_DEFINITIONS } from "../src/sim/buildingConstants";
import { GOODS } from "../src/sim/goods";
import { JOBS } from "../src/sim/jobs";
import { BREAD_PER_RESIDENT_PER_DAY, WATER_PER_RESIDENT_PER_DAY } from "../src/sim/needConstants";
import { CONSUMED_GOODS, RATION_PER_DAY } from "../src/sim/needs";
import { countWorkersByJob, produceHour, runWorkerHours } from "../src/sim/production";
import { getProductionChain, producersOf, recipeGoods } from "../src/sim/productionChain";
import { RECIPES } from "../src/sim/productionConstants";
import { findShortages } from "../src/sim/shortages";
import { createInitialState, tick } from "../src/sim/state";
import {
  SEED,
  finished,
  makeResident,
  makeState,
  storageWith,
  waterAndWoodState,
  wheatChainState,
} from "./chainFixtures";

describe("findShortages (AC1 to AC5)", () => {
  it("finds nothing missing in a new game", () => {
    expect(findShortages(createInitialState(SEED))).toEqual({ missing: [], bottlenecks: [] });
  });

  it("finds nothing missing over the first days of a new game, which has no work buildings", () => {
    let state = createInitialState(SEED);
    for (let hour = 0; hour < 48; hour++) {
      expect(findShortages(state).missing).toEqual([]);
      state = tick(state);
    }
  });

  it("names wheat the only bottleneck of the wheat → flour → bread chain", () => {
    expect(findShortages(wheatChainState())).toEqual({
      missing: ["wheat", "flour", "bread"],
      bottlenecks: ["wheat"],
    });
  });

  it("names water and wood both bottlenecks when both block the baker, water only once", () => {
    // Water is also below the one resident's ration, so it is missing twice over.
    expect(findShortages(waterAndWoodState())).toEqual({
      missing: ["water", "wood"],
      bottlenecks: ["water", "wood"],
    });
  });

  it("lists every input of a blocked worker, not only the first one", () => {
    const state = makeState([finished(3, "bakery")], [makeResident(1, 3)], storageWith({ bread: 5, water: 5 }));
    expect(findShortages(state).missing).toEqual(["flour", "wood"]);
  });

  it("follows the produceHour order: a field before the mill feeds the miller in the same hour", () => {
    const residents = [makeResident(1, 3), makeResident(2, 4)];
    const storage = storageWith({ bread: 10, water: 10 });
    const fieldFirst = makeState([finished(3, "field"), finished(4, "mill")], residents, storage);
    expect(findShortages(fieldFirst)).toEqual({ missing: [], bottlenecks: [] });

    const millFirst = makeState([finished(4, "mill"), finished(3, "field")], residents, storage);
    expect(findShortages(millFirst)).toEqual({ missing: ["wheat"], bottlenecks: ["wheat"] });
  });

  it("counts a good missing when only the second worker of a building is short", () => {
    const residents = [makeResident(1, 3), makeResident(2, 3)];
    const enough = { bread: 10, water: 10 };
    const oneHour = RECIPES.miller.inputs.wheat ?? 0;
    expect(oneHour).toBeGreaterThan(0);

    const forOne = makeState([finished(3, "mill")], residents, storageWith({ ...enough, wheat: oneHour }));
    expect(findShortages(forOne).missing).toEqual(["wheat"]);

    const forBoth = makeState([finished(3, "mill")], residents, storageWith({ ...enough, wheat: 2 * oneHour }));
    expect(findShortages(forBoth).missing).toEqual([]);
  });

  it("ignores residents beyond a building's places, as production does", () => {
    const places = BUILDING_DEFINITIONS.mill.workplaces;
    const residents = Array.from({ length: places + 1 }, (_, i) => makeResident(i + 1, 3));
    const oneHour = RECIPES.miller.inputs.wheat ?? 0;
    const storage = storageWith({ bread: 10, water: 10, wheat: places * oneHour });
    expect(findShortages(makeState([finished(3, "mill")], residents, storage)).missing).toEqual([]);
  });

  it("never counts a worker in a house, a construction site or an unknown building", () => {
    const buildings = [finished(1, "house"), { id: 2, type: "bakery" as const, hoursLeft: 5 }];
    const residents = [makeResident(1, 1), makeResident(2, 2), makeResident(3, 99)];
    const state = makeState(buildings, residents, storageWith({ bread: 10, water: 10 }));
    expect(findShortages(state)).toEqual({ missing: [], bottlenecks: [] });
  });

  it("does not count flour at 0 as missing without a staffed, finished bakery (AC4)", () => {
    const storage = storageWith({ bread: 10, water: 10 });
    const unstaffed = makeState([finished(3, "bakery")], [makeResident(1, null)], storage);
    expect(findShortages(unstaffed).missing).toEqual([]);
    const building = makeState([{ id: 3, type: "bakery", hoursLeft: 1 }], [makeResident(1, 3)], storage);
    expect(findShortages(building).missing).toEqual([]);
  });

  it("counts water below the residents' need as missing, and exactly equal as enough (AC3)", () => {
    const residents = [makeResident(1, null), makeResident(2, null), makeResident(3, null)];
    const need = residents.length * WATER_PER_RESIDENT_PER_DAY;
    const bread = residents.length * BREAD_PER_RESIDENT_PER_DAY;

    const below = makeState([], residents, storageWith({ bread, water: need - 0.125 }));
    expect(findShortages(below)).toEqual({ missing: ["water"], bottlenecks: ["water"] });

    const equal = makeState([], residents, storageWith({ bread, water: need }));
    expect(findShortages(equal)).toEqual({ missing: [], bottlenecks: [] });
  });

  it("counts bread below the residents' need as missing", () => {
    const residents = [makeResident(1, null), makeResident(2, null)];
    const state = makeState([], residents, storageWith({ bread: 1, water: 10 }));
    expect(findShortages(state)).toEqual({ missing: ["bread"], bottlenecks: ["bread"] });
  });

  it("finds nothing missing for residents when there are none, even with an empty storage", () => {
    expect(findShortages(makeState([], [], storageWith()))).toEqual({ missing: [], bottlenecks: [] });
  });

  it("returns both lists in GOODS order without duplicates", () => {
    for (const state of [wheatChainState(), waterAndWoodState()]) {
      const { missing, bottlenecks } = findShortages(state);
      for (const list of [missing, bottlenecks]) {
        expect(new Set(list).size).toBe(list.length);
        expect([...list].sort((a, b) => GOODS.indexOf(a) - GOODS.indexOf(b))).toEqual(list);
      }
      for (const good of bottlenecks) expect(missing).toContain(good);
    }
  });

  it("does not mutate the state", () => {
    for (const state of [createInitialState(SEED), wheatChainState(), waterAndWoodState()]) {
      const before = structuredClone(state);
      findShortages(state);
      expect(state).toEqual(before);
    }
  });
});

describe("shared worker-hour loop (AC2)", () => {
  it("gives produceHour the same storage as runWorkerHours", () => {
    for (const state of [wheatChainState(), waterAndWoodState()]) {
      const { storage } = runWorkerHours(state.buildings, state.residents, state.storage);
      expect(produceHour(state.buildings, state.residents, state.storage)).toEqual(storage);
    }
  });

  it("reports the goods that blocked an idle worker, and none for a worker who worked", () => {
    const blocked = waterAndWoodState();
    expect([...runWorkerHours(blocked.buildings, blocked.residents, blocked.storage).blockedBy].sort()).toEqual([
      "water",
      "wood",
    ]);
    const working = makeState([finished(3, "well")], [makeResident(1, 3)], storageWith());
    expect(runWorkerHours(working.buildings, working.residents, working.storage).blockedBy.size).toBe(0);
  });

  it("does not mutate its inputs", () => {
    const state = wheatChainState();
    const before = structuredClone(state);
    runWorkerHours(state.buildings, state.residents, state.storage);
    expect(state).toEqual(before);
  });

  it("counts workers per job with the capacity limit", () => {
    const places = BUILDING_DEFINITIONS.well.workplaces;
    const residents = [
      ...Array.from({ length: places + 1 }, (_, i) => makeResident(i + 1, 3)),
      makeResident(10, 4),
      makeResident(11, 5),
      makeResident(12, null),
    ];
    const buildings = [finished(3, "well"), finished(4, "well"), { id: 5, type: "mill" as const, hoursLeft: 3 }];
    expect(countWorkersByJob(buildings, residents)).toEqual({
      waterCarrier: places + 1,
      farmer: 0,
      miller: 0,
      baker: 0,
      woodcutter: 0,
    });
  });
});

describe("daily rations (AC3)", () => {
  it("exports bread and water with their rations", () => {
    expect(CONSUMED_GOODS).toEqual(["bread", "water"]);
    expect(RATION_PER_DAY).toEqual({ bread: BREAD_PER_RESIDENT_PER_DAY, water: WATER_PER_RESIDENT_PER_DAY });
    expect(Object.isFrozen(RATION_PER_DAY)).toBe(true);
  });
});

describe("getProductionChain (AC6)", () => {
  it("orders today's jobs from raw goods to bread", () => {
    expect(getProductionChain().map((step) => step.job)).toEqual([
      "waterCarrier",
      "farmer",
      "woodcutter",
      "miller",
      "baker",
    ]);
  });

  it("lists the inputs and outputs of RECIPES in GOODS order", () => {
    expect(getProductionChain()).toEqual([
      { job: "waterCarrier", inputs: [], outputs: ["water"] },
      { job: "farmer", inputs: [], outputs: ["wheat"] },
      { job: "woodcutter", inputs: [], outputs: ["wood"] },
      { job: "miller", inputs: ["wheat"], outputs: ["flour"] },
      { job: "baker", inputs: ["flour", "water", "wood"], outputs: ["bread"] },
    ]);
    for (const step of getProductionChain()) {
      expect(step.inputs).toEqual(recipeGoods(RECIPES[step.job].inputs));
      expect(step.outputs).toEqual(recipeGoods(RECIPES[step.job].outputs));
    }
  });

  it("holds every job once, each after every producer of its inputs", () => {
    const order = getProductionChain().map((step) => step.job);
    expect([...order].sort()).toEqual([...JOBS].sort());
    order.forEach((job, index) => {
      for (const good of recipeGoods(RECIPES[job].inputs)) {
        for (const producer of producersOf(good)) {
          expect(order.indexOf(producer)).toBeLessThan(index);
        }
      }
    });
  });

  it("returns fresh arrays, so a caller cannot change the next result", () => {
    const first = getProductionChain();
    first[0]?.outputs.push("tools");
    expect(getProductionChain()[0]?.outputs).toEqual(["water"]);
  });
});
