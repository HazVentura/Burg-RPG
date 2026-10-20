import { createRandom } from "../src/sim/random";

describe("createRandom", () => {
  it("returns the same sequence for the same seed", () => {
    const a = createRandom(42);
    const b = createRandom(42);
    const seqA = [a.next(), a.next(), a.next()];
    const seqB = [b.next(), b.next(), b.next()];
    expect(seqA).toEqual(seqB);
  });

  it("returns numbers in [0, 1)", () => {
    const random = createRandom(7);
    for (let i = 0; i < 1000; i++) {
      const value = random.next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it("can continue a sequence from its stored seed", () => {
    const original = createRandom(123);
    original.next();
    const resumed = createRandom(original.seed);
    expect(resumed.next()).toBe(original.next());
  });
});
