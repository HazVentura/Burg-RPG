import { GOODS, type Good } from "../src/sim/goods";
import { createInitialState, tick, type GameState } from "../src/sim/state";
import { INITIAL_STORAGE } from "../src/sim/storageConstants";

const SEED = 42;

function tickTimes(state: GameState, count: number): GameState {
  let current = state;
  for (let i = 0; i < count; i++) {
    current = tick(current);
  }
  return current;
}

describe("GOODS", () => {
  it("lists the eight goods in display order", () => {
    expect(GOODS).toEqual(["wheat", "flour", "bread", "water", "wood", "stone", "ironOre", "tools"]);
  });

  it("has no duplicates", () => {
    expect(new Set(GOODS).size).toBe(GOODS.length);
  });

  it("derives the Good type from the array", () => {
    const good: Good = GOODS[0];
    expect(good).toBe("wheat");
  });
});

describe("INITIAL_STORAGE", () => {
  it("holds the start values from vision section 10", () => {
    expect(INITIAL_STORAGE).toEqual({
      wheat: 0,
      flour: 0,
      bread: 60,
      water: 40,
      wood: 50,
      stone: 20,
      ironOre: 0,
      tools: 0,
    });
  });

  it("is frozen so no game can change it", () => {
    expect(Object.isFrozen(INITIAL_STORAGE)).toBe(true);
  });
});

describe("initial storage", () => {
  it("fills storage with the start values", () => {
    const { storage } = createInitialState(SEED);
    expect(storage.bread).toBe(60);
    expect(storage.water).toBe(40);
    expect(storage.wood).toBe(50);
    expect(storage.stone).toBe(20);
    expect(storage.wheat).toBe(0);
    expect(storage.flour).toBe(0);
    expect(storage.ironOre).toBe(0);
    expect(storage.tools).toBe(0);
  });

  it("has exactly one entry per good and no other keys", () => {
    const { storage } = createInitialState(SEED);
    expect(Object.keys(storage).sort()).toEqual([...GOODS].sort());
  });

  it("takes its values from INITIAL_STORAGE", () => {
    expect(createInitialState(SEED).storage).toEqual(INITIAL_STORAGE);
  });

  it("does not depend on the seed", () => {
    expect(createInitialState(0).storage).toEqual(createInitialState(SEED).storage);
  });

  it("returns a fresh storage object on every call", () => {
    const a = createInitialState(SEED);
    const b = createInitialState(SEED);
    expect(a.storage).not.toBe(b.storage);
    expect(a.storage).not.toBe(INITIAL_STORAGE);

    a.storage.bread = 1;
    a.storage.tools = 7;

    expect(b.storage.bread).toBe(60);
    expect(b.storage.tools).toBe(0);
    expect(INITIAL_STORAGE.bread).toBe(60);
    expect(INITIAL_STORAGE.tools).toBe(0);
    expect(createInitialState(SEED).storage.bread).toBe(60);
  });
});

describe("tick and storage", () => {
  it("leaves the storage unchanged over 960 ticks, except bread and water", () => {
    // Bread and water are eaten daily (tests/needs.test.ts); no other good changes yet.
    const initial = createInitialState(SEED);
    const later = tickTimes(initial, 960);
    for (const good of GOODS) {
      if (good === "bread" || good === "water") continue;
      expect(later.storage[good]).toBe(initial.storage[good]);
      expect(later.storage[good]).toBe(INITIAL_STORAGE[good]);
    }
    expect(later.storage.bread).toBeLessThanOrEqual(INITIAL_STORAGE.bread);
    expect(later.storage.water).toBeLessThanOrEqual(INITIAL_STORAGE.water);
    expect(Object.keys(later.storage).sort()).toEqual([...GOODS].sort());
  });

  it("does not mutate the input storage", () => {
    let current = createInitialState(SEED);
    for (let i = 0; i < 960; i++) {
      const before = structuredClone(current);
      tick(current);
      // The input, including its nested storage, deep-equals its clone from before the call.
      expect(current).toEqual(before);
      expect(current.storage).toEqual(before.storage);
      current = tick(current);
    }
  });
});

describe("storage serialization", () => {
  function roundTrip(state: GameState): unknown {
    return JSON.parse(JSON.stringify(state));
  }

  it("survives a JSON round trip with the nested storage", () => {
    for (const count of [0, 1, 24, 960]) {
      const state = tickTimes(createInitialState(SEED), count);
      expect(roundTrip(state)).toStrictEqual(state);
    }
  });

  it("keeps every amount a finite, non-negative number", () => {
    const { storage } = tickTimes(createInitialState(SEED), 960);
    expect(Object.getPrototypeOf(storage)).toBe(Object.prototype);
    for (const good of GOODS) {
      expect(Number.isFinite(storage[good])).toBe(true);
      expect(storage[good]).toBeGreaterThanOrEqual(0);
    }
  });
});
