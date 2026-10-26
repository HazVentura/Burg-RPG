import { orderBuilding, setJobTarget, setPinnedJob } from "../src/sim/commands";
import { BUILDING_TYPES, isBuildingType, type BuildingType } from "../src/sim/buildings";
import { JOBS, isJob, type Job } from "../src/sim/jobs";
import { createInitialState, tick, type GameState } from "../src/sim/state";

const SEED = 42;

/** A state with a finished well, so a valid command would change workplaces. */
function withWell(): GameState {
  const ordered = orderBuilding(createInitialState(SEED), "well");
  if (!ordered.ok) throw new Error(ordered.reason);
  let state = ordered.state;
  for (let i = 0; i < 24; i++) state = tick(state);
  return state;
}

// Values a tampered <select> or a stale save could hand over.
const BAD_JOBS = ["", "miner", "Bäcker", "WATERCARRIER", "toString", "__proto__", undefined, 3] as unknown as Job[];

describe("isJob", () => {
  it("accepts every job and nothing else", () => {
    for (const job of JOBS) expect(isJob(job)).toBe(true);
    for (const value of [...BAD_JOBS, null]) expect(isJob(value)).toBe(false);
  });
});

describe("job guard in setJobTarget (AC1)", () => {
  it("rejects a value that is not a job and changes nothing", () => {
    const state = withWell();
    const before = structuredClone(state);
    for (const job of BAD_JOBS) {
      expect(setJobTarget(state, job, 2)).toEqual({ ok: false, reason: "unknownJob" });
    }
    expect(state).toStrictEqual(before);
  });

  it("still accepts every job", () => {
    for (const job of JOBS) expect(setJobTarget(withWell(), job, 1).ok).toBe(true);
  });
});

describe("job guard in setPinnedJob (AC1)", () => {
  it("rejects a value that is not a job and changes nothing", () => {
    const state = withWell();
    const before = structuredClone(state);
    for (const job of BAD_JOBS) {
      expect(setPinnedJob(state, 1, job)).toEqual({ ok: false, reason: "unknownJob" });
    }
    expect(state).toStrictEqual(before);
  });

  it("still accepts null and every job", () => {
    expect(setPinnedJob(withWell(), 1, null).ok).toBe(true);
    for (const job of JOBS) expect(setPinnedJob(withWell(), 1, job).ok).toBe(true);
  });
});

// Values a tampered button or a stale save could hand over.
const BAD_BUILDINGS = ["", "mine", "Brunnen", "WELL", "toString", "__proto__", undefined, null, 3] as unknown as BuildingType[];

describe("isBuildingType", () => {
  it("accepts every building type and nothing else", () => {
    for (const type of BUILDING_TYPES) expect(isBuildingType(type)).toBe(true);
    for (const value of BAD_BUILDINGS) expect(isBuildingType(value)).toBe(false);
  });
});

describe("building guard in orderBuilding (AC1)", () => {
  it("rejects a value that is not a building type and changes nothing", () => {
    const state = createInitialState(SEED);
    const before = structuredClone(state);
    for (const type of BAD_BUILDINGS) {
      expect(orderBuilding(state, type)).toEqual({ ok: false, reason: "unknownBuilding" });
    }
    expect(state).toStrictEqual(before);
  });

  it("still accepts every building type", () => {
    for (const type of BUILDING_TYPES) expect(orderBuilding(createInitialState(SEED), type).ok).toBe(true);
  });
});
