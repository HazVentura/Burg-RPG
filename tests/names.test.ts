import { GIVEN_NAMES, pickName } from "../src/sim/names";
import { createRandom } from "../src/sim/random";
import { SEXES } from "../src/sim/residents";

const SEED = 42;

describe("GIVEN_NAMES", () => {
  it("has at least 30 names per sex", () => {
    for (const sex of SEXES) {
      expect(GIVEN_NAMES[sex].length).toBeGreaterThanOrEqual(30);
    }
  });

  it("has no duplicates within a list", () => {
    for (const sex of SEXES) {
      expect(new Set(GIVEN_NAMES[sex]).size).toBe(GIVEN_NAMES[sex].length);
    }
  });

  it("shares no name between the female and the male list", () => {
    const female = new Set(GIVEN_NAMES.female);
    expect(GIVEN_NAMES.male.filter((name) => female.has(name))).toEqual([]);
  });

  it("holds only non-empty, trimmed names", () => {
    for (const sex of SEXES) {
      for (const name of GIVEN_NAMES[sex]) {
        expect(name.length).toBeGreaterThan(0);
        expect(name.trim()).toBe(name);
      }
    }
  });

  it("contains period names from the spec", () => {
    for (const name of ["Adelheid", "Gertrud", "Hedwig", "Kunigunde", "Mechthild"]) {
      expect(GIVEN_NAMES.female).toContain(name);
    }
    for (const name of ["Konrad", "Heinrich", "Gottfried", "Ulrich", "Wolfram"]) {
      expect(GIVEN_NAMES.male).toContain(name);
    }
  });
});

describe("pickName", () => {
  it("picks a name from the list for the sex with an empty taken list", () => {
    for (const sex of SEXES) {
      expect(GIVEN_NAMES[sex]).toContain(pickName(createRandom(SEED), sex, []));
    }
  });

  it("gives the same name for the same random state and input", () => {
    for (const sex of SEXES) {
      expect(pickName(createRandom(SEED), sex, [])).toBe(pickName(createRandom(SEED), sex, []));
    }
  });

  it("draws exactly one random value", () => {
    const random = createRandom(SEED);
    pickName(random, "female", []);
    const reference = createRandom(SEED);
    reference.next();
    expect(random.seed).toBe(reference.seed);
  });

  it("avoids taken names", () => {
    const taken = GIVEN_NAMES.male.slice(0, 20);
    for (let seed = 0; seed < 50; seed++) {
      const name = pickName(createRandom(seed), "male", taken);
      expect(GIVEN_NAMES.male).toContain(name);
      expect(taken).not.toContain(name);
    }
  });

  it("returns the only free name when all names but one are taken", () => {
    const names = GIVEN_NAMES.female;
    const free = names[names.length - 1];
    const taken = names.slice(0, -1);
    for (let seed = 0; seed < 20; seed++) {
      expect(pickName(createRandom(seed), "female", taken)).toBe(free);
    }
  });

  it("falls back to any name of the list when every name is taken", () => {
    for (const sex of SEXES) {
      const taken = [...GIVEN_NAMES[sex]];
      for (let seed = 0; seed < 20; seed++) {
        expect(GIVEN_NAMES[sex]).toContain(pickName(createRandom(seed), sex, taken));
      }
    }
  });

  it("ignores taken names of the other sex", () => {
    const name = pickName(createRandom(SEED), "male", [...GIVEN_NAMES.female]);
    expect(name).toBe(pickName(createRandom(SEED), "male", []));
  });
});
