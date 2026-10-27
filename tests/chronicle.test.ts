import type { Building, BuildingType } from "../src/sim/buildings";
import { detectEvents, prependEntries, type ChronicleEntry } from "../src/sim/chronicle";
import { CHRONICLE_MAX_ENTRIES } from "../src/sim/chronicleConstants";
import { orderBuilding, setJobTarget, setPinnedJob } from "../src/sim/commands";
import { GOODS, type Storage } from "../src/sim/goods";
import { JOBS, jobForBuilding, type Job } from "../src/sim/jobs";
import { isAdult, type Resident } from "../src/sim/residents";
import { createInitialState, tick, type GameState } from "../src/sim/state";
import { HOURS_PER_DAY, HOURS_PER_YEAR } from "../src/sim/timeConstants";

const SEED = 42;

function tickTimes(state: GameState, count: number): GameState {
  let current = state;
  for (let i = 0; i < count; i++) current = tick(current);
  return current;
}

function ok<T extends { ok: boolean }>(result: T): Extract<T, { ok: true }> {
  if (!result.ok) throw new Error(`command refused: ${JSON.stringify(result)}`);
  return result as Extract<T, { ok: true }>;
}

function makeResident(id: number, workplaceId: number | null): Resident {
  return {
    id,
    name: `R${id}`,
    sex: id % 2 === 1 ? "female" : "male",
    bornAtHour: -5 * HOURS_PER_YEAR,
    partnerId: null,
    needs: { bread: 100, water: 100, housing: 100 },
    workplaceId,
    pinnedJob: null,
    homeId: null,
  };
}

function building(id: number, type: BuildingType, hoursLeft = 0): Building {
  return { id, type, hoursLeft };
}

function storageWith(goods: Partial<Storage> = {}): Storage {
  const storage = Object.fromEntries(GOODS.map((good) => [good, 0])) as Storage;
  return { ...storage, ...goods };
}

/** Wish numbers that keep a hand-made staffing as it is under assignJobs. */
function targetsFor(buildings: readonly Building[], residents: readonly Resident[]): Record<Job, number> {
  const targets = Object.fromEntries(JOBS.map((job) => [job, 0])) as Record<Job, number>;
  for (const resident of residents) {
    const workplace = buildings.find((b) => b.id === resident.workplaceId);
    const job = workplace === undefined ? null : jobForBuilding(workplace.type);
    if (job !== null) targets[job] += 1;
  }
  return targets;
}

/** A hand-made state; hour 1 by default, so the next tick is not a consumption tick. */
function makeState(buildings: Building[], residents: Resident[], storage: Storage, elapsedHours = 1): GameState {
  return {
    elapsedHours,
    rngState: 123,
    storage,
    residents,
    nextResidentId: residents.length + 1,
    buildings,
    nextBuildingId: Math.max(0, ...buildings.map((b) => b.id)) + 1,
    jobTargets: targetsFor(buildings, residents),
    fieldWheat: 0,
    chronicle: [],
    nextChronicleId: 0,
  };
}

describe("initial chronicle (AC2)", () => {
  it("starts empty with the running number at 0", () => {
    const state = createInitialState(SEED);
    expect(state.chronicle).toEqual([]);
    expect(state.nextChronicleId).toBe(0);
  });

  it("gets a fresh array per game", () => {
    expect(createInitialState(SEED).chronicle).not.toBe(createInitialState(SEED).chronicle);
  });
});

describe("buildingFinished (AC3)", () => {
  it("records a well exactly in the tick it finishes, at hour 24", () => {
    const ordered = ok(orderBuilding(createInitialState(SEED), "well")).state;
    const wellId = ordered.nextBuildingId - 1;
    const before = tickTimes(ordered, 23);
    expect(before.chronicle).toEqual([]);
    const after = tick(before);
    expect(after.chronicle).toEqual([{ kind: "buildingFinished", hour: 24, buildingId: wellId, buildingType: "well" }]);
    expect(after.nextChronicleId).toBe(1);
  });

  it("never records an already finished building again", () => {
    const ordered = ok(orderBuilding(createInitialState(SEED), "well")).state;
    // Hours 25 to 47 are not consumption ticks, so no good can run out either.
    const later = tickTimes(ordered, 47);
    expect(later.chronicle.filter((entry) => entry.kind === "buildingFinished")).toHaveLength(1);
  });

  it("records houses too", () => {
    const ordered = ok(orderBuilding(createInitialState(SEED), "house")).state;
    // A house takes 2 days; tick 24 eats nothing up yet, so only the house can appear.
    const finished = tickTimes(ordered, 48);
    expect(finished.chronicle.filter((entry) => entry.kind === "buildingFinished")).toEqual([
      { kind: "buildingFinished", hour: 48, buildingId: 3, buildingType: "house" },
    ]);
  });

  it("gives a field and a well ordered together separate entries in different ticks", () => {
    let state = ok(orderBuilding(createInitialState(SEED), "field")).state;
    state = ok(orderBuilding(state, "well")).state;
    state = tickTimes(state, 24);
    expect(state.chronicle).toEqual([
      { kind: "buildingFinished", hour: 24, buildingId: 4, buildingType: "well" },
      { kind: "buildingFinished", hour: 12, buildingId: 3, buildingType: "field" },
    ]);
  });

  it("ignores the starting houses, which are finished from the start", () => {
    expect(tick(createInitialState(SEED)).chronicle).toEqual([]);
  });
});

describe("goodRanOut (AC4)", () => {
  /** Two residents at hour 23 with `bread` loaves, so the next tick eats them. */
  function breadState(bread: number): GameState {
    return makeState([], [makeResident(1, null), makeResident(2, null)], storageWith({ bread, water: 100 }), HOURS_PER_DAY - 1);
  }

  it("records bread once when the daily ration eats the last loaf", () => {
    const after = tick(breadState(2));
    expect(after.storage.bread).toBe(0);
    expect(after.chronicle).toEqual([{ kind: "goodRanOut", hour: 24, good: "bread" }]);
  });

  it("adds nothing more while bread stays at 0", () => {
    const later = tickTimes(breadState(2), 1 + 3 * HOURS_PER_DAY);
    expect(later.storage.bread).toBe(0);
    expect(later.chronicle).toEqual([{ kind: "goodRanOut", hour: 24, good: "bread" }]);
  });

  it("does not record a good that does not reach exactly 0", () => {
    // 3 loaves, 2 eaten: 1 left.
    expect(tick(breadState(3)).chronicle).toEqual([]);
  });

  it("records a good again after it was back in stock and ran out again", () => {
    const empty = tick(breadState(2));
    // Restocked by hand to simulate a bakery; the next midnight eats it again.
    const restocked: GameState = { ...tickTimes(empty, HOURS_PER_DAY - 1), storage: { ...empty.storage, bread: 2 } };
    const again = tick(restocked);
    expect(again.elapsedHours).toBe(2 * HOURS_PER_DAY);
    expect(again.chronicle).toEqual([
      { kind: "goodRanOut", hour: 48, good: "bread" },
      { kind: "goodRanOut", hour: 24, good: "bread" },
    ]);
    expect(again.nextChronicleId).toBe(2);
  });

  it("records a good used up by production", () => {
    // One miller uses the last 0.5 wheat.
    const state = makeState([building(1, "mill")], [makeResident(1, 1)], storageWith({ wheat: 0.5 }));
    expect(tick(state).chronicle).toEqual([{ kind: "goodRanOut", hour: 2, good: "wheat" }]);
  });

  it("ignores a good that touches 0 within the tick but is refilled by its end", () => {
    // The mill works first and uses the last wheat; the field listed after it harvests
    // the last 0.5 wheat on the fields in autumn (hour 480 is the first autumn hour).
    const state = {
      ...makeState(
        [building(1, "mill"), building(2, "field")],
        [makeResident(1, 1), makeResident(2, 2)],
        storageWith({ wheat: 0.5 }),
        481,
      ),
      fieldWheat: 0.5,
    };
    const after = tick(state);
    expect(after.storage.wheat).toBe(0.5);
    expect(after.chronicle).toEqual([]);
  });

  it("ignores goods that start the game at 0", () => {
    // Over 4 days, only bread and water can be recorded: wheat, flour, iron ore and tools were never in stock.
    const state = tickTimes(createInitialState(SEED), 4 * HOURS_PER_DAY);
    expect(state.chronicle).toEqual([]);
  });
});

describe("order within a tick (AC5)", () => {
  it("lists finished buildings in list order, then goods in GOODS order", () => {
    // Mill 1 runs out of wheat; well 2 and mill 3 finish in the same tick at midnight,
    // where the one resident also eats the last bread.
    const state = makeState(
      [building(1, "mill"), building(2, "well", 1), building(3, "mill", 1)],
      [makeResident(1, 1)],
      storageWith({ wheat: 0.5, bread: 1, water: 50 }),
      HOURS_PER_DAY - 1,
    );
    expect(tick(state).chronicle).toEqual([
      { kind: "buildingFinished", hour: 24, buildingId: 2, buildingType: "well" },
      { kind: "buildingFinished", hour: 24, buildingId: 3, buildingType: "mill" },
      { kind: "goodRanOut", hour: 24, good: "wheat" },
      { kind: "goodRanOut", hour: 24, good: "bread" },
    ]);
  });

  it("puts the entries of a newer tick in front of older ones", () => {
    const old: ChronicleEntry = { kind: "goodRanOut", hour: 5, good: "water" };
    const state = { ...makeState([building(1, "well", 1)], [], storageWith()), chronicle: [old], nextChronicleId: 1 };
    expect(tick(state).chronicle).toEqual([
      { kind: "buildingFinished", hour: 2, buildingId: 1, buildingType: "well" },
      old,
    ]);
  });

  it("detectEvents matches buildings by id, not by position", () => {
    const start = { buildings: [building(7, "well", 1)], storage: storageWith() };
    const end = { buildings: [building(7, "well", 0)], storage: storageWith() };
    expect(detectEvents(start, end, 3)).toEqual([{ kind: "buildingFinished", hour: 3, buildingId: 7, buildingType: "well" }]);
  });
});

describe("cap (AC6)", () => {
  it("is 50 entries", () => {
    expect(CHRONICLE_MAX_ENTRIES).toBe(50);
  });

  it("keeps only the newest entries, newest at index 0", () => {
    // One event per tick: before each tick a new well with 1 hour left is added.
    const count = CHRONICLE_MAX_ENTRIES + 10;
    let state = makeState([], [], storageWith());
    for (let i = 0; i < count; i++) {
      state = { ...state, buildings: [...state.buildings, building(i + 1, "well", 1)], nextBuildingId: i + 2 };
      state = tick(state);
    }
    expect(state.chronicle).toHaveLength(CHRONICLE_MAX_ENTRIES);
    expect(state.nextChronicleId).toBe(count);
    expect(state.chronicle[0]).toMatchObject({ kind: "buildingFinished", buildingId: count, hour: state.elapsedHours });
    expect(state.chronicle.at(-1)).toMatchObject({ buildingId: count - CHRONICLE_MAX_ENTRIES + 1 });
  });

  it("prependEntries drops the oldest entries beyond the cap", () => {
    const old = Array.from({ length: CHRONICLE_MAX_ENTRIES }, (_, i): ChronicleEntry => ({ kind: "goodRanOut", hour: 100 - i, good: "water" }));
    const fresh: ChronicleEntry = { kind: "goodRanOut", hour: 101, good: "bread" };
    const result = prependEntries(old, [fresh]);
    expect(result).toHaveLength(CHRONICLE_MAX_ENTRIES);
    expect(result[0]).toBe(fresh);
    expect(result.at(-1)).toBe(old[CHRONICLE_MAX_ENTRIES - 2]);
  });
});

describe("purity and commands (AC7)", () => {
  it("keeps the same chronicle array in a tick without events", () => {
    const state = tick(createInitialState(SEED));
    expect(tick(state).chronicle).toBe(state.chronicle);
  });

  it("does not mutate the input chronicle when adding entries", () => {
    const ordered = tickTimes(ok(orderBuilding(createInitialState(SEED), "well")).state, 23);
    const before = structuredClone(ordered);
    tick(ordered);
    expect(ordered).toEqual(before);
  });

  it("orderBuilding that spends Holz to 0 adds no entry", () => {
    const state = { ...createInitialState(SEED), storage: { ...createInitialState(SEED).storage, wood: 10 } };
    const ordered = ok(orderBuilding(state, "well")).state;
    expect(ordered.storage.wood).toBe(0);
    expect(ordered.chronicle).toEqual([]);
    expect(ordered.nextChronicleId).toBe(0);
    // The next tick does not record it either: wood was already 0 at its start.
    expect(tick(ordered).chronicle).toEqual([]);
  });

  it("setJobTarget and setPinnedJob add no entry", () => {
    const state = createInitialState(SEED);
    expect(ok(setJobTarget(state, "farmer", 2)).state.chronicle).toEqual([]);
    const adult = state.residents.find((resident) => isAdult(resident, state.elapsedHours));
    if (adult === undefined) throw new Error("no adult settler");
    expect(ok(setPinnedJob(state, adult.id, "farmer")).state.chronicle).toEqual([]);
  });
});
