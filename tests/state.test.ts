import { START_JOB_TARGETS } from "../src/sim/jobConstants";
import { createRandom } from "../src/sim/random";
import { INITIAL_STORAGE } from "../src/sim/storageConstants";
import { createSettlers } from "../src/sim/residents";
import { createInitialState, tick, type GameState } from "../src/sim/state";

const SEED = 42;

function tickTimes(state: GameState, count: number): GameState {
  let current = state;
  for (let i = 0; i < count; i++) {
    current = tick(current);
  }
  return current;
}

describe("createInitialState", () => {
  it("starts with zero elapsed hours", () => {
    expect(createInitialState(SEED).elapsedHours).toBe(0);
  });

  it("stores the generator state after the settler draws", () => {
    // The same draws on a fresh generator end in the same state.
    const random = createRandom(SEED);
    createSettlers(random);
    expect(createInitialState(SEED).rngState).toBe(random.seed);
  });

  it("keeps rngState a 32-bit unsigned integer, also for seeds 0 and -1", () => {
    for (const seed of [SEED, 0, -1]) {
      const { rngState } = createInitialState(seed);
      expect(Number.isInteger(rngState)).toBe(true);
      expect(rngState).toBeGreaterThanOrEqual(0);
      expect(rngState).toBeLessThanOrEqual(4294967295);
    }
  });

  it("gives a deterministic rngState per seed, also for seeds 0 and -1", () => {
    for (const seed of [SEED, 0, -1]) {
      expect(createInitialState(seed).rngState).toBe(createInitialState(seed).rngState);
    }
  });

  it("continues the random sequence where settler creation stopped", () => {
    for (const seed of [SEED, 0, -1]) {
      const random = createRandom(seed);
      createSettlers(random);
      expect(createRandom(createInitialState(seed).rngState).next()).toBe(random.next());
    }
  });

  it("gives deep-equal states for the same seed", () => {
    expect(createInitialState(SEED)).toEqual(createInitialState(SEED));
  });

  it("gives different rngStates for different seeds", () => {
    expect(createInitialState(1).rngState).not.toBe(createInitialState(2).rngState);
    expect(createInitialState(0).rngState).not.toBe(createInitialState(-1).rngState);
  });
});

describe("tick", () => {
  it("raises elapsedHours by exactly 1", () => {
    const initial = createInitialState(SEED);
    expect(tick(initial).elapsedHours).toBe(1);
    expect(tick(tick(initial)).elapsedHours).toBe(2);
  });

  it("raises elapsedHours by N after N ticks", () => {
    expect(tickTimes(createInitialState(SEED), 960).elapsedHours).toBe(960);
  });

  it("leaves rngState unchanged", () => {
    const initial = createInitialState(SEED);
    expect(tickTimes(initial, 960).rngState).toBe(initial.rngState);
  });

  it("does not mutate its argument", () => {
    const state = tickTimes(createInitialState(SEED), 5);
    const before = structuredClone(state);
    tick(state);
    expect(state).toEqual(before);
  });

  it("returns a new object", () => {
    const state = createInitialState(SEED);
    expect(tick(state)).not.toBe(state);
  });

  it("gives deep-equal output for the same input", () => {
    const state = tickTimes(createInitialState(SEED), 7);
    expect(tick(state)).toEqual(tick(state));
  });

  it("does not mutate any state over 960 ticks", () => {
    let current = createInitialState(SEED);
    for (let i = 0; i < 960; i++) {
      const before = structuredClone(current);
      const next = tick(current);
      expect(current).toEqual(before);
      expect(next).not.toBe(current);
      current = next;
    }
    const initial = createInitialState(SEED);
    // Without production, 40 days of eating use up all bread and water; every food need ends at 0.
    // Everyone keeps the bed from the start, so Wohnraum stays full.
    expect(current).toEqual({
      elapsedHours: 960,
      rngState: initial.rngState,
      storage: { ...INITIAL_STORAGE, bread: 0, water: 0 },
      fieldWheat: 0,
      residents: initial.residents.map((resident) => ({ ...resident, needs: { bread: 0, water: 0, housing: 100 }, workplaceId: null, pinnedJob: null })),
      nextResidentId: 9,
      buildings: [
        { id: 1, type: "house", hoursLeft: 0 },
        { id: 2, type: "house", hoursLeft: 0 },
      ],
      nextBuildingId: 3,
      // The start wish numbers stay, but without work buildings nobody works.
      jobTargets: { ...START_JOB_TARGETS },
      // 8 residents drink 40 water in 5 days (hour 120) and eat 60 bread by day 8 (hour 192); newest first.
      chronicle: [
        { kind: "goodRanOut", hour: 192, good: "bread" },
        { kind: "goodRanOut", hour: 120, good: "water" },
      ],
      nextChronicleId: 2,
    });
  });

  it("gives the same result when a run of 960 ticks is repeated", () => {
    const runA = tickTimes(createInitialState(SEED), 960);
    const runB = tickTimes(createInitialState(SEED), 960);
    expect(runA).toEqual(runB);
  });
});

describe("GameState serialization", () => {
  function roundTrip(state: GameState): unknown {
    return JSON.parse(JSON.stringify(state));
  }

  it("survives a JSON round trip for the initial state", () => {
    const state = createInitialState(SEED);
    expect(roundTrip(state)).toStrictEqual(state);
  });

  it("survives a JSON round trip after ticks", () => {
    for (const count of [1, 24, 240, 960, 1000]) {
      const state = tickTimes(createInitialState(SEED), count);
      expect(roundTrip(state)).toStrictEqual(state);
    }
  });

  it("is a plain object holding finite numbers and a plain storage object", () => {
    const state = tickTimes(createInitialState(-1), 100);
    expect(Object.getPrototypeOf(state)).toBe(Object.prototype);
    expect(Object.keys(state).sort()).toEqual([
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
    for (const value of [
      state.elapsedHours,
      state.rngState,
      state.nextResidentId,
      state.nextBuildingId,
      state.nextChronicleId,
      state.fieldWheat,
    ]) {
      expect(typeof value).toBe("number");
      expect(Number.isFinite(value)).toBe(true);
    }
    expect(Object.getPrototypeOf(state.storage)).toBe(Object.prototype);
    for (const value of Object.values(state.storage)) {
      expect(typeof value).toBe("number");
      expect(Number.isFinite(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(0);
    }
  });

  it("keeps elapsedHours a non-negative integer", () => {
    const state = tickTimes(createInitialState(SEED), 500);
    expect(Number.isInteger(state.elapsedHours)).toBe(true);
    expect(state.elapsedHours).toBeGreaterThanOrEqual(0);
  });
});
