import { createRandom } from "../src/sim/random";
import { INITIAL_STORAGE } from "../src/sim/storageConstants";
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

  it("stores the random generator state for the seed", () => {
    expect(createInitialState(SEED).rngState).toBe(createRandom(SEED).seed);
    expect(createInitialState(SEED).rngState).toBe(42);
  });

  it("maps a seed of 0 to rngState 0", () => {
    expect(createInitialState(0).rngState).toBe(0);
  });

  it("maps a negative seed to its unsigned 32-bit value", () => {
    expect(createInitialState(-1).rngState).toBe(4294967295);
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
    expect(current).toEqual({ elapsedHours: 960, rngState: 42, storage: { ...INITIAL_STORAGE } });
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
    expect(Object.keys(state).sort()).toEqual(["elapsedHours", "rngState", "storage"]);
    for (const value of [state.elapsedHours, state.rngState]) {
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
