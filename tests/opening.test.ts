// The opening of a new game, played with the real commands and tick only:
// start wish numbers (START_JOB_TARGETS) staff every work building the player
// orders, and the starting goods are enough to reach a working well and bakery.

import { BUILDING_DEFINITIONS } from "../src/sim/buildingConstants";
import type { BuildingType } from "../src/sim/buildings";
import type { ChronicleEntry } from "../src/sim/chronicle";
import { orderBuilding, setJobTarget } from "../src/sim/commands";
import { START_JOB_TARGETS } from "../src/sim/jobConstants";
import { JOBS, JOB_BUILDING, type Job } from "../src/sim/jobs";
import { RECIPES } from "../src/sim/productionConstants";
import { isAdult } from "../src/sim/residents";
import { createInitialState, tick, type GameState } from "../src/sim/state";
import { INITIAL_STORAGE } from "../src/sim/storageConstants";
import { HOURS_PER_DAY } from "../src/sim/timeConstants";
import { formatJobTargets } from "../src/ui/formatResidents";

const SEED = 42;
const END_TICK = 20 * HOURS_PER_DAY;
const BAKERY_WOOD = BUILDING_DEFINITIONS.bakery.cost.wood;

function order(state: GameState, type: BuildingType): GameState {
  const result = orderBuilding(state, type);
  expect(result.ok, `order ${type} at hour ${state.elapsedHours}`).toBe(true);
  if (!result.ok) throw new Error(result.reason);
  return result.state;
}

function tickTimes(state: GameState, count: number): GameState {
  let current = state;
  for (let i = 0; i < count; i++) current = tick(current);
  return current;
}

function workersIn(state: GameState, type: BuildingType): number {
  const ids = new Set(state.buildings.filter((b) => b.type === type).map((b) => b.id));
  return state.residents.filter((r) => r.workplaceId !== null && ids.has(r.workplaceId)).length;
}

describe("START_JOB_TARGETS (AC1)", () => {
  it("is frozen and has exactly one key per job", () => {
    expect(Object.isFrozen(START_JOB_TARGETS)).toBe(true);
    expect(Object.keys(START_JOB_TARGETS).sort()).toEqual([...JOBS].sort());
  });

  it("has the worked-out values, adding up to the 8 starting adults", () => {
    expect(START_JOB_TARGETS).toEqual({ waterCarrier: 2, farmer: 2, miller: 1, baker: 1, woodcutter: 2 });
    const sum = JOBS.reduce((total, job) => total + START_JOB_TARGETS[job], 0);
    const adults = createInitialState(SEED).residents.filter((r) => isAdult(r, 0)).length;
    expect(sum).toBe(8);
    expect(adults).toBe(sum);
  });

  it("makes enough of every good for the chain, by RECIPES at 12 hours of output per 0.5", () => {
    const perDay = (job: Job, side: "inputs" | "outputs", good: keyof typeof INITIAL_STORAGE) =>
      START_JOB_TARGETS[job] * (RECIPES[job][side][good] ?? 0) * HOURS_PER_DAY;
    const residents = 8;
    expect(perDay("waterCarrier", "outputs", "water")).toBeGreaterThanOrEqual(residents + perDay("baker", "inputs", "water"));
    expect(perDay("baker", "outputs", "bread")).toBeGreaterThanOrEqual(residents);
    expect(perDay("miller", "outputs", "flour")).toBeGreaterThanOrEqual(perDay("baker", "inputs", "flour"));
    expect(perDay("farmer", "outputs", "wheat")).toBeGreaterThanOrEqual(perDay("miller", "inputs", "wheat"));
    expect(perDay("woodcutter", "outputs", "wood")).toBeGreaterThan(perDay("baker", "inputs", "wood"));
  });
});

describe("createInitialState with start wish numbers (AC2)", () => {
  it("sets a fresh copy of START_JOB_TARGETS for every seed", () => {
    for (const seed of [SEED, 0, -1, 123456]) {
      const state = createInitialState(seed);
      expect(state.jobTargets).toEqual(START_JOB_TARGETS);
      expect(state.jobTargets).not.toBe(START_JOB_TARGETS);
    }
  });

  it("never shares jobTargets between games or with the constant", () => {
    const a = createInitialState(SEED);
    const b = createInitialState(SEED);
    expect(a.jobTargets).not.toBe(b.jobTargets);
    a.jobTargets.waterCarrier = 7;
    expect(b.jobTargets.waterCarrier).toBe(2);
    expect(START_JOB_TARGETS.waterCarrier).toBe(2);
    expect(createInitialState(SEED).jobTargets.waterCarrier).toBe(2);
  });

  it("changes nothing else in the initial state", () => {
    const state = createInitialState(SEED);
    expect(state.storage).toEqual({ ...INITIAL_STORAGE });
    expect(state.storage).toEqual({ wheat: 0, flour: 0, bread: 60, water: 40, wood: 50, stone: 20, ironOre: 0, tools: 0 });
    expect(state.buildings).toEqual([
      { id: 1, type: "house", hoursLeft: 0 },
      { id: 2, type: "house", hoursLeft: 0 },
    ]);
    expect(state.residents.every((r) => r.workplaceId === null && r.pinnedJob === null)).toBe(true);
    // rngState and settlers recorded on main before this job; seed 42.
    expect(state.rngState).toBe(1007906594);
    expect(state.residents.map((r) => [r.id, r.name, r.bornAtHour, r.partnerId])).toEqual([
      [1, "Mechthild", -7536, 2],
      [2, "Rudolf", -6264, 1],
      [3, "Gertrud", -8496, 4],
      [4, "Hugo", -6600, 3],
      [5, "Richardis", -5928, 6],
      [6, "Leopold", -9216, 5],
      [7, "Adelheid", -7512, 8],
      [8, "Arnold", -7704, 7],
    ]);
  });
});

describe("a new game without player action (AC3)", () => {
  it("lets nobody work, runs out of water after 5 days and drops the water need on day 6", () => {
    let state = createInitialState(SEED);
    for (let t = 1; t <= 6 * HOURS_PER_DAY; t++) {
      state = tick(state);
      expect(state.residents.every((r) => r.workplaceId === null)).toBe(true);
      if (t === 5 * HOURS_PER_DAY) {
        expect(state.storage.water).toBe(0);
        expect(state.residents.every((r) => r.needs.water === 100)).toBe(true);
      }
    }
    expect(state.elapsedHours).toBe(144);
    expect(state.residents.every((r) => r.needs.water < 100)).toBe(true);
  });
});

describe("start wish numbers act like player-set ones (AC4)", () => {
  it("staffs a finished well with residents 1 and 2 without any setJobTarget", () => {
    const ordered = order(createInitialState(SEED), "well");
    expect(BUILDING_DEFINITIONS.well.buildHours).toBe(24);
    let state = ordered;
    for (let t = 1; t < 24; t++) {
      state = tick(state);
      expect(state.residents.every((r) => r.workplaceId === null)).toBe(true);
    }
    state = tick(state);
    const wellId = ordered.nextBuildingId - 1;
    expect(state.residents.map((r) => r.workplaceId)).toEqual([wellId, wellId, null, null, null, null, null, null]);
    const waterBefore = state.storage.water;
    state = tick(state);
    expect(state.storage.water).toBe(waterBefore + 2 * RECIPES.waterCarrier.outputs.water!);
    expect(state.storage.water).toBe(waterBefore + 1);
  });

  it("can still be changed by the player, down to 0", () => {
    let state = tickTimes(order(createInitialState(SEED), "well"), 24);
    for (const job of JOBS) {
      const result = setJobTarget(state, job, 0);
      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error(result.reason);
      state = result.state;
    }
    expect(Object.values(state.jobTargets).every((count) => count === 0)).toBe(true);
    expect(state.residents.every((r) => r.workplaceId === null)).toBe(true);
  });
});

/**
 * Plays the opening: at `firstOrderHour`, order well, field, woodcutter hut and
 * mill; in the first later hour with enough wood, order the bakery; then only
 * tick up to day 20.
 *
 * Wood is the tight part: well, field, mill and bakery together cost 45 of the
 * 50 starting wood, and the woodcutter hut makes it 55. So the hut is built
 * first and the bakery waits until the woodcutters have made the missing wood.
 * This is why the woodcutter hut matters in the opening.
 */
function playOpening(firstOrderHour: number) {
  let state = createInitialState(SEED);
  const ranOut: ChronicleEntry[] = [];
  const midnightNeeds: { hour: number; bread: number[]; water: number[] }[] = [];
  let bakeryOrderedAt: number | null = null;
  let bakeryId: number | null = null;
  let workersAtBakeryFinish: { well: number; bakery: number } | null = null;
  let minBread = Infinity;
  let minWater = Infinity;

  let firstOrdersPlaced = false;

  // Every tick from hour 0 is watched, including those before the first orders.
  while (state.elapsedHours < END_TICK) {
    if (state.elapsedHours === firstOrderHour) {
      for (const type of ["well", "field", "woodcutterHut", "mill"] as const) {
        state = order(state, type);
      }
      // 40 wood and 8 stone paid, 10 wood and 12 stone left.
      expect([state.storage.wood, state.storage.stone]).toEqual([10, 12]);
      firstOrdersPlaced = true;
    }
    if (firstOrdersPlaced && bakeryOrderedAt === null && state.storage.wood >= BAKERY_WOOD) {
      bakeryOrderedAt = state.elapsedHours;
      bakeryId = state.nextBuildingId;
      state = order(state, "bakery");
    }
    const next = tick(state);
    // Every entry recorded in this tick (the chronicle is newest first).
    const fresh = next.chronicle.slice(0, next.nextChronicleId - state.nextChronicleId);
    ranOut.push(...fresh.filter((entry) => entry.kind === "goodRanOut"));
    const bakeryDone = fresh.some((entry) => entry.kind === "buildingFinished" && entry.buildingId === bakeryId);
    if (bakeryDone) {
      workersAtBakeryFinish = { well: workersIn(next, "well"), bakery: workersIn(next, "bakery") };
    }
    if (next.elapsedHours % HOURS_PER_DAY === 0) {
      midnightNeeds.push({
        hour: next.elapsedHours,
        bread: next.residents.map((r) => r.needs.bread),
        water: next.residents.map((r) => r.needs.water),
      });
    }
    minBread = Math.min(minBread, next.storage.bread);
    minWater = Math.min(minWater, next.storage.water);
    state = next;
  }
  return { state, ranOut, midnightNeeds, bakeryOrderedAt, workersAtBakeryFinish, minBread, minWater };
}

function expectWinnable(result: ReturnType<typeof playOpening>) {
  expect(result.state.elapsedHours).toBe(END_TICK);
  expect(result.bakeryOrderedAt).not.toBeNull();
  expect(result.midnightNeeds).toHaveLength(20);
  for (const { hour, bread, water } of result.midnightNeeds) {
    expect(bread, `bread needs at hour ${hour}`).toEqual(Array(8).fill(100));
    expect(water, `water needs at hour ${hour}`).toEqual(Array(8).fill(100));
  }
  const breadOrWater = result.ranOut.filter((e) => e.kind === "goodRanOut" && (e.good === "bread" || e.good === "water"));
  expect(breadOrWater).toEqual([]);
  // The start wish numbers staff the well and the bakery, with no player change.
  expect(result.workersAtBakeryFinish).toEqual({ well: 2, bakery: 1 });
  // No job is starved because an earlier job in JOBS order took everyone.
  for (const job of JOBS) {
    expect(workersIn(result.state, JOB_BUILDING[job]), job).toBe(START_JOB_TARGETS[job]);
  }
}

describe("the opening is winnable (AC5, AC6)", () => {
  it("on day 1: orders at hour 0, bakery once wood allows, fed through day 20", () => {
    const result = playOpening(0);
    // Woodcutters work from tick 25 at 1 wood an hour: 10 + 5 = 15 at hour 29.
    expect(result.bakeryOrderedAt).toBe(29);
    expectWinnable(result);
    expect(result.minBread).toBeGreaterThan(0);
    expect(result.minWater).toBeGreaterThan(0);
  });

  it("one day late: orders at hour 24, still fed through day 20", () => {
    const result = playOpening(HOURS_PER_DAY);
    expect(result.bakeryOrderedAt).toBe(HOURS_PER_DAY + 29);
    expectWinnable(result);
  });
});

describe("wish number controls on a new page (AC8)", () => {
  it("show 2, 2, 1, 1, 2 in JOBS order with no places yet", () => {
    const rows = formatJobTargets(createInitialState(SEED));
    expect(rows.map((row) => row.job)).toEqual([...JOBS]);
    expect(rows.map((row) => row.target)).toEqual([2, 2, 1, 1, 2]);
    expect(rows.every((row) => row.occupancyText === "0 von 0 Plätzen besetzt")).toBe(true);
  });
});
