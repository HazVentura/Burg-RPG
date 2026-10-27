// Job 017: wheat grows on the fields in spring and summer, is harvested into
// storage in autumn, and the fields rest in winter. Hand-made states, so every
// number can be checked exactly.

import type { Building } from "../src/sim/buildings";
import { getCalendarAt } from "../src/sim/calendar";
import { GROWING_SEASONS, HARVEST_PER_FARMER_HOUR, HARVEST_SEASON } from "../src/sim/farmingConstants";
import type { Storage } from "../src/sim/goods";
import { JOBS, jobForBuilding, type Job } from "../src/sim/jobs";
import { produceHour, runWorkerHours } from "../src/sim/production";
import { producersOf } from "../src/sim/productionChain";
import { RECIPES } from "../src/sim/productionConstants";
import type { Resident } from "../src/sim/residents";
import { createInitialState, tick, type GameState } from "../src/sim/state";
import { DAYS_PER_SEASON, HOURS_PER_DAY, SEASONS } from "../src/sim/timeConstants";
import { finished, makeResident, storageWith } from "./chainFixtures";

const GROWTH = RECIPES.farmer.outputs.wheat ?? 0;
const SPRING = 0;
const SUMMER_END = 2 * DAYS_PER_SEASON * HOURS_PER_DAY; // 480, the first autumn hour
const AUTUMN_END = 3 * DAYS_PER_SEASON * HOURS_PER_DAY; // 720, the first winter hour

/** The first hour of a season in year 1, plus `offset` hours. */
function hourIn(season: (typeof SEASONS)[number], offset = 1): number {
  return SEASONS.indexOf(season) * DAYS_PER_SEASON * HOURS_PER_DAY + offset;
}

/**
 * A hand-made state whose wish numbers match its staffing, so assignJobs in
 * tick keeps every resident where the test put them.
 */
function makeState(
  buildings: Building[],
  residents: Resident[],
  options: { hour: number; fieldWheat?: number; storage?: Storage },
): GameState {
  const jobTargets = Object.fromEntries(JOBS.map((job) => [job, 0])) as Record<Job, number>;
  for (const resident of residents) {
    const building = buildings.find((b) => b.id === resident.workplaceId);
    const job = building === undefined ? null : jobForBuilding(building.type);
    if (job !== null) jobTargets[job] += 1;
  }
  return {
    elapsedHours: options.hour,
    rngState: 123,
    // Bread and water so nobody goes hungry in the longer runs; it does not matter for production.
    storage: options.storage ?? storageWith({ bread: 1000, water: 1000 }),
    fieldWheat: options.fieldWheat ?? 0,
    residents,
    nextResidentId: Math.max(0, ...residents.map((r) => r.id)) + 1,
    buildings,
    nextBuildingId: Math.max(0, ...buildings.map((b) => b.id)) + 1,
    jobTargets,
    chronicle: [],
    nextChronicleId: 0,
  };
}

/** One finished field (id 3) with `farmers` farmers. */
function fieldState(farmers: number, hour: number, fieldWheat = 0): GameState {
  const residents = Array.from({ length: farmers }, (_, index) => makeResident(index + 1, 3));
  return makeState([finished(3, "field")], residents, { hour, fieldWheat });
}

function tickTimes(state: GameState, count: number): GameState {
  let current = state;
  for (let i = 0; i < count; i++) current = tick(current);
  return current;
}

describe("fieldWheat in the state (AC1)", () => {
  it("starts at 0 for every seed", () => {
    for (const seed of [42, 0, -1, 7, 123456]) {
      expect(createInitialState(seed).fieldWheat).toBe(0);
    }
  });

  it("survives a JSON round trip, also when fractional", () => {
    const state = tick(fieldState(1, SPRING));
    expect(state.fieldWheat).toBe(0.5);
    expect(JSON.parse(JSON.stringify(state))).toStrictEqual(state);
  });
});

describe("season of a tick (AC2)", () => {
  it("uses the season of the hour the tick starts in", () => {
    expect(getCalendarAt(SUMMER_END - 1).season).toBe("summer");
    expect(getCalendarAt(SUMMER_END).season).toBe("autumn");
  });

  it("grows in the tick from 479 to 480 and harvests from 480 to 481", () => {
    const summerTick = tick(fieldState(1, SUMMER_END - 1, 10));
    expect(summerTick.elapsedHours).toBe(SUMMER_END);
    expect(summerTick.fieldWheat).toBe(10 + GROWTH);
    expect(summerTick.storage.wheat).toBe(0);

    const autumnTick = tick(summerTick);
    expect(autumnTick.fieldWheat).toBe(10 + GROWTH - HARVEST_PER_FARMER_HOUR);
    expect(autumnTick.storage.wheat).toBe(HARVEST_PER_FARMER_HOUR);
  });

  it("harvests in the tick from 719 to 720 and rests from 720 to 721", () => {
    const autumnTick = tick(fieldState(1, AUTUMN_END - 1, 10));
    expect(autumnTick.fieldWheat).toBe(8);
    expect(autumnTick.storage.wheat).toBe(2);

    const winterTick = tick(autumnTick);
    expect(winterTick.fieldWheat).toBe(0);
    expect(winterTick.storage.wheat).toBe(2);
  });
});

describe("what a farmer does in each season (AC3 to AC5)", () => {
  it("grows 0.5 on the fields in spring, storage unchanged (AC3)", () => {
    const state = fieldState(1, SPRING);
    const next = tick(state);
    expect(next.fieldWheat).toBe(0.5);
    expect(next.storage).toEqual(state.storage);
  });

  it("grows the same in summer (AC3)", () => {
    const next = tick(fieldState(1, hourIn("summer"), 4));
    expect(next.fieldWheat).toBe(4.5);
    expect(next.storage.wheat).toBe(0);
  });

  it("harvests 2 an hour in autumn: 10 → 8, 1 → 0, 0 → 0 (AC4)", () => {
    for (const [before, after, gained] of [
      [10, 8, 2],
      [1, 0, 1],
      [0, 0, 0],
    ] as const) {
      const state = fieldState(1, SUMMER_END, before);
      const next = tick(state);
      expect(next.fieldWheat, `field ${before}`).toBe(after);
      expect(next.storage.wheat - state.storage.wheat, `field ${before}`).toBe(gained);
    }
  });

  it("lets two farmers share a small harvest in resident order (AC4)", () => {
    // The first farmer takes the full 2, the second only the 0.5 that is left.
    const next = tick(fieldState(2, SUMMER_END, 2.5));
    expect(next.fieldWheat).toBe(0);
    expect(next.storage.wheat).toBe(2.5);
    // With room for both, each takes 2.
    const plenty = tick(fieldState(2, SUMMER_END, 10));
    expect(plenty.fieldWheat).toBe(6);
    expect(plenty.storage.wheat).toBe(4);
  });

  it("lets a miller mill the harvest in the same tick when the field comes first (AC4)", () => {
    const residents = [makeResident(1, 3), makeResident(2, 4)];
    const storage = storageWith({ bread: 10, water: 10 });
    const fieldFirst = tick(makeState([finished(3, "field"), finished(4, "mill")], residents, { hour: SUMMER_END, fieldWheat: 10, storage }));
    expect(fieldFirst.fieldWheat).toBe(8);
    expect(fieldFirst.storage.wheat).toBe(1.5);
    expect(fieldFirst.storage.flour).toBe(0.5);

    // The mill before the field finds no wheat yet and idles this tick.
    const millFirst = tick(makeState([finished(4, "mill"), finished(3, "field")], residents, { hour: SUMMER_END, fieldWheat: 10, storage }));
    expect(millFirst.storage.wheat).toBe(2);
    expect(millFirst.storage.flour).toBe(0);
  });

  it("rests in winter and loses the wheat left on the fields (AC5)", () => {
    const state = fieldState(1, AUTUMN_END, 5);
    const next = tick(state);
    expect(next.fieldWheat).toBe(0);
    expect(next.storage).toEqual(state.storage);
  });

  it("ends every winter tick with 0 on the fields, with or without farmers (AC5)", () => {
    for (const farmers of [0, 1, 3]) {
      let state = fieldState(farmers, AUTUMN_END, 7);
      for (let i = 0; i < DAYS_PER_SEASON * HOURS_PER_DAY; i++) {
        expect(getCalendarAt(state.elapsedHours).season).toBe("winter");
        state = tick(state);
        expect(state.fieldWheat).toBe(0);
      }
    }
  });
});

describe("only farmers follow the seasons (AC6)", () => {
  // Every other job, with enough inputs for an hour; field before mill would
  // feed the miller, so no field here.
  function otherJobsState(hour: number): GameState {
    const buildings = [finished(3, "well"), finished(4, "mill"), finished(5, "bakery"), finished(6, "woodcutterHut")];
    const residents = buildings.map((b, index) => makeResident(index + 1, b.id));
    return makeState(buildings, residents, {
      hour,
      fieldWheat: 5,
      storage: storageWith({ wheat: 10, flour: 10, water: 10, wood: 10, bread: 10 }),
    });
  }

  it("lets every other job work the same in every season", () => {
    const results = SEASONS.map((season) => tick(otherJobsState(hourIn(season))).storage);
    for (const storage of results) expect(storage).toEqual(results[0]);
    expect(results[0]).toEqual(storageWith({ wheat: 9.5, flour: 10.25, water: 10.25, wood: 10.375, bread: 10.5 }));
  });

  it("never lets another job change the wheat on the fields outside winter", () => {
    for (const season of ["spring", "summer", "autumn"] as const) {
      expect(tick(otherJobsState(hourIn(season))).fieldWheat, season).toBe(5);
    }
  });

  it("never lets field wheat or storage go below 0 over a whole year", () => {
    const buildings = [finished(3, "field"), finished(4, "mill"), finished(5, "field")];
    const residents = [makeResident(1, 3), makeResident(2, 4), makeResident(3, 4), makeResident(4, 5)];
    let state = makeState(buildings, residents, { hour: 0, storage: storageWith({ wheat: 3, bread: 500, water: 500 }) });
    for (let i = 0; i < 4 * DAYS_PER_SEASON * HOURS_PER_DAY; i++) {
      state = tick(state);
      expect(state.fieldWheat).toBeGreaterThanOrEqual(0);
      for (const value of Object.values(state.storage)) expect(value).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("farming constants (AC7)", () => {
  it("has the agreed season rules and harvest amount", () => {
    expect(GROWING_SEASONS).toEqual(["spring", "summer"]);
    expect(HARVEST_SEASON).toBe("autumn");
    expect(HARVEST_PER_FARMER_HOUR).toBe(2);
    // A multiple of 1/8, so storage sums stay exact.
    expect(Number.isInteger(HARVEST_PER_FARMER_HOUR * 8)).toBe(true);
  });

  it("keeps the farmer recipe, so the production chain still names the farmer for wheat", () => {
    expect(RECIPES.farmer).toEqual({ inputs: {}, outputs: { wheat: 0.5 } });
    expect(producersOf("wheat")).toEqual(["farmer"]);
  });
});

describe("shared worker-hour loop with seasons (AC8)", () => {
  it("gives the same storage and field wheat as produceHour in every season", () => {
    const state = makeState([finished(3, "field"), finished(4, "mill")], [makeResident(1, 3), makeResident(2, 4)], {
      hour: 0,
      fieldWheat: 3,
    });
    for (const season of SEASONS) {
      const dryRun = runWorkerHours(state.buildings, state.residents, state.storage, season, state.fieldWheat);
      const real = produceHour(state.buildings, state.residents, state.storage, season, state.fieldWheat);
      expect(real).toEqual({ storage: dryRun.storage, fieldWheat: dryRun.fieldWheat });
    }
  });
});

describe("one full year (AC12)", () => {
  it("grows 480 by hour 480, has it all in storage after 120 autumn ticks, and is empty at hour 721", () => {
    const start = fieldState(2, SPRING);
    const atHarvest = tickTimes(start, SUMMER_END);
    expect(atHarvest.elapsedHours).toBe(480);
    expect(atHarvest.fieldWheat).toBe(480);
    expect(atHarvest.storage.wheat).toBe(0);

    const afterHarvest = tickTimes(atHarvest, 120);
    expect(afterHarvest.fieldWheat).toBe(0);
    expect(afterHarvest.storage.wheat).toBe(480);

    const winter = tickTimes(afterHarvest, AUTUMN_END + 1 - afterHarvest.elapsedHours);
    expect(winter.elapsedHours).toBe(721);
    expect(winter.fieldWheat).toBe(0);
    expect(winter.storage.wheat).toBe(480);
  });
});

describe("purity (AC12)", () => {
  it("never mutates the input state in any season", () => {
    for (const season of SEASONS) {
      const state = makeState([finished(3, "field"), finished(4, "mill")], [makeResident(1, 3), makeResident(2, 4)], {
        hour: hourIn(season, HOURS_PER_DAY - 1),
        fieldWheat: 3,
      });
      const before = structuredClone(state);
      tick(state);
      runWorkerHours(state.buildings, state.residents, state.storage, season, state.fieldWheat);
      produceHour(state.buildings, state.residents, state.storage, season, state.fieldWheat);
      expect(state).toStrictEqual(before);
    }
  });
});
