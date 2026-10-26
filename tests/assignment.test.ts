import { getJob, assignJobs } from "../src/sim/assignment";
import { BUILDING_DEFINITIONS } from "../src/sim/buildingConstants";
import { BUILDING_TYPES, type Building, type BuildingType } from "../src/sim/buildings";
import { orderBuilding, setJobTarget, setPinnedJob } from "../src/sim/commands";
import { JOBS, JOB_BUILDING, jobForBuilding, type Job } from "../src/sim/jobs";
import { createRandom } from "../src/sim/random";
import { ADULT_AGE_YEARS, START_AGE_MIN_YEARS } from "../src/sim/residentConstants";
import { getAgeYears, isAdult, type Resident } from "../src/sim/residents";
import { createInitialState, tick, type GameState } from "../src/sim/state";
import { INITIAL_STORAGE } from "../src/sim/storageConstants";
import { HOURS_PER_DAY, HOURS_PER_YEAR } from "../src/sim/timeConstants";

const SEED = 42;

function zeroTargets(): Record<Job, number> {
  return { waterCarrier: 0, farmer: 0, miller: 0, baker: 0, woodcutter: 0 };
}

function finished(id: number, type: BuildingType): Building {
  return { id, type, hoursLeft: 0 };
}

function tickTimes(state: GameState, count: number): GameState {
  let current = state;
  for (let i = 0; i < count; i++) current = tick(current);
  return current;
}

/** An adult resident (exactly ADULT_AGE_YEARS at hour 0) unless bornAtHour says otherwise. */
function makeResident(id: number, fields: Partial<Resident> = {}): Resident {
  return {
    id,
    name: `R${id}`,
    sex: id % 2 === 1 ? "female" : "male",
    bornAtHour: -ADULT_AGE_YEARS * HOURS_PER_YEAR,
    partnerId: null,
    needs: { bread: 100, water: 100 },
    workplaceId: null,
    pinnedJob: null,
    ...fields,
  };
}

function makeState(
  buildings: Building[],
  residents: Resident[],
  targets: Partial<Record<Job, number>> = {},
  elapsedHours = 0,
): GameState {
  return {
    elapsedHours,
    rngState: 7,
    storage: { ...INITIAL_STORAGE },
    residents,
    nextResidentId: Math.max(0, ...residents.map((r) => r.id)) + 1,
    buildings,
    nextBuildingId: Math.max(0, ...buildings.map((b) => b.id)) + 1,
    jobTargets: { ...zeroTargets(), ...targets },

    chronicle: [],
    nextChronicleId: 0,
  };
}

/** The seed-42 game with a finished well (id 3, 2 places) and field (id 4, 4 places). */
function wellAndField(): GameState {
  const initial = createInitialState(SEED);
  return { ...initial, buildings: [...initial.buildings, finished(3, "well"), finished(4, "field")], nextBuildingId: 5 };
}

function target(state: GameState, job: Job, count: number): GameState {
  const result = setJobTarget(state, job, count);
  if (!result.ok) throw new Error(result.reason);
  return result.state;
}

function pin(state: GameState, residentId: number, job: Job | null): GameState {
  const result = setPinnedJob(state, residentId, job);
  if (!result.ok) throw new Error(result.reason);
  return result.state;
}

const places = (state: GameState) => state.residents.map((r) => r.workplaceId);

function workersOf(state: GameState, job: Job): number {
  return state.residents.filter((r) => getJob(state.buildings, r) === job).length;
}

describe("state fields (AC1, AC2)", () => {
  it("starts every wish number at 0, one key per job", () => {
    const { jobTargets } = createInitialState(SEED);
    expect(Object.keys(jobTargets).sort()).toEqual([...JOBS].sort());
    expect(jobTargets).toEqual(zeroTargets());
  });

  it("gives every game a fresh jobTargets object", () => {
    const a = createInitialState(SEED);
    const b = createInitialState(SEED);
    expect(a.jobTargets).not.toBe(b.jobTargets);
  });

  it("starts every settler unpinned and without a workplace, for several seeds", () => {
    for (const seed of [SEED, 0, -1]) {
      for (const resident of createInitialState(seed).residents) {
        expect(resident.pinnedJob).toBeNull();
        expect(resident.workplaceId).toBeNull();
      }
    }
  });

  it("leaves a new game without targets or pins idle after many ticks", () => {
    const state = tickTimes(createInitialState(SEED), 2 * HOURS_PER_DAY + 5);
    expect(state.jobTargets).toEqual(zeroTargets());
    expect(state.residents.every((r) => r.workplaceId === null && r.pinnedJob === null)).toBe(true);
    expect(state.rngState).toBe(createInitialState(SEED).rngState);
  });
});

describe("adult age (AC3)", () => {
  it("is 5 game years, the youngest starting age", () => {
    expect(ADULT_AGE_YEARS).toBe(5);
    expect(START_AGE_MIN_YEARS).toBe(ADULT_AGE_YEARS);
  });

  it("starts exactly at the fifth birthday", () => {
    const resident = makeResident(1, { bornAtHour: 0 });
    const birthday = ADULT_AGE_YEARS * HOURS_PER_YEAR;
    expect(isAdult(resident, birthday - 1)).toBe(false);
    expect(isAdult(resident, birthday)).toBe(true);
    expect(getAgeYears(resident, birthday)).toBe(ADULT_AGE_YEARS);
  });

  it("makes every starting settler an adult", () => {
    for (const resident of createInitialState(SEED).residents) expect(isAdult(resident, 0)).toBe(true);
  });

  it("never gives a child a workplace, even with free places and wish numbers", () => {
    const child = makeResident(1, { bornAtHour: -HOURS_PER_YEAR });
    const state = assignJobs(makeState([finished(3, "well")], [child, makeResident(2)], { waterCarrier: 2 }));
    expect(places(state)).toEqual([null, 3]);
  });

  it("staffs a resident from the tick of their fifth birthday", () => {
    const birthday = ADULT_AGE_YEARS * HOURS_PER_YEAR;
    const youth = makeResident(1, { bornAtHour: -birthday + 1 });
    const state = makeState([finished(3, "well")], [youth], { waterCarrier: 1 }, 0);
    expect(places(assignJobs(state))).toEqual([null]);
    expect(places(tick(state))).toEqual([3]);
  });
});

describe("clearing invalid workplaces (AC4)", () => {
  it("clears unknown ids, houses, construction sites and children", () => {
    const buildings = [finished(1, "house"), { id: 2, type: "well", hoursLeft: 5 } as Building, finished(3, "field")];
    const residents = [
      makeResident(1, { workplaceId: 99 }),
      makeResident(2, { workplaceId: 1 }),
      makeResident(3, { workplaceId: 2 }),
      makeResident(4, { workplaceId: 3, bornAtHour: -HOURS_PER_YEAR }),
    ];
    const state = assignJobs(makeState(buildings, residents));
    expect(places(state)).toEqual([null, null, null, null]);
  });

  it("moves a pinned resident out of a building of another job", () => {
    const buildings = [finished(3, "well"), finished(4, "field")];
    const resident = makeResident(1, { workplaceId: 3, pinnedJob: "farmer" });
    expect(places(assignJobs(makeState(buildings, [resident], { waterCarrier: 2 })))).toEqual([4]);
    expect(places(assignJobs(makeState([finished(3, "well")], [resident], { waterCarrier: 2 })))).toEqual([null]);
  });

  it("clears a workplace in a building that was removed from the list", () => {
    const state = makeState([finished(3, "well")], [makeResident(1, { workplaceId: 3 })], { waterCarrier: 1 });
    expect(places(assignJobs(state))).toEqual([3]);
    expect(places(assignJobs({ ...state, buildings: [] }))).toEqual([null]);
  });
});

describe("pinned residents (AC5)", () => {
  it("keeps the exact building of a pinned resident, even if an earlier one has room", () => {
    const buildings = [finished(3, "field"), finished(4, "field")];
    const state = assignJobs(makeState(buildings, [makeResident(1, { workplaceId: 4, pinnedJob: "farmer" })]));
    expect(places(state)).toEqual([4]);
  });

  it("places pinned residents in the first building with room, in list order", () => {
    const buildings = [finished(3, "well"), finished(4, "well")];
    const residents = [1, 2, 3].map((id) => makeResident(id, { pinnedJob: "waterCarrier" }));
    expect(places(assignJobs(makeState(buildings, residents)))).toEqual([3, 3, 4]);
  });

  it("lets pinned residents beyond the slots wait idle instead of taking another job", () => {
    const buildings = [finished(3, "well"), finished(4, "field")];
    const residents = [1, 2, 3].map((id) => makeResident(id, { pinnedJob: "waterCarrier" }));
    const state = assignJobs(makeState(buildings, residents, { farmer: 4 }));
    expect(places(state)).toEqual([3, 3, null]);
  });

  it("keeps pinned residents in an overfull building only while it has room", () => {
    const residents = [1, 2, 3].map((id) => makeResident(id, { workplaceId: 3, pinnedJob: "waterCarrier" }));
    expect(places(assignJobs(makeState([finished(3, "well")], residents)))).toEqual([3, 3, null]);
    // With a second well the third pinned resident moves there.
    expect(places(assignJobs(makeState([finished(3, "well"), finished(4, "well")], residents)))).toEqual([3, 3, 4]);
  });

  it("gives pinned residents priority over automatic workers", () => {
    // Four automatic farmers fill the field; a pinned resident still gets a place.
    const residents = [
      ...[1, 2, 3, 4].map((id) => makeResident(id, { workplaceId: 3 })),
      makeResident(5, { pinnedJob: "farmer" }),
    ];
    const state = assignJobs(makeState([finished(3, "field")], residents, { farmer: 4 }));
    expect(places(state)).toEqual([3, 3, 3, null, 3]);
  });

  it("lets a pinned resident wait when no building of the job exists", () => {
    const state = assignJobs(makeState([finished(3, "well")], [makeResident(1, { pinnedJob: "miller" })], { waterCarrier: 1 }));
    expect(places(state)).toEqual([null]);
  });

  it("does not count a pinned child toward the job", () => {
    const child = makeResident(1, { pinnedJob: "farmer", bornAtHour: -HOURS_PER_YEAR });
    const state = assignJobs(makeState([finished(3, "field")], [child, makeResident(2)], { farmer: 1 }));
    expect(places(state)).toEqual([null, 3]);
  });
});

describe("automatic workers (AC6, AC7)", () => {
  it("keeps the exact building of an automatic worker within the quota", () => {
    const buildings = [finished(3, "field"), finished(4, "field")];
    const state = assignJobs(makeState(buildings, [makeResident(1, { workplaceId: 4 })], { farmer: 1 }));
    expect(places(state)).toEqual([4]);
  });

  it("releases the later automatic workers beyond the quota", () => {
    const residents = [1, 2, 3].map((id) => makeResident(id, { workplaceId: 3 }));
    expect(places(assignJobs(makeState([finished(3, "field")], residents, { farmer: 1 })))).toEqual([3, null, null]);
  });

  it("fills jobs in JOBS order, then free adults in list order", () => {
    const buildings = [finished(3, "woodcutterHut"), finished(4, "field"), finished(5, "well")];
    const residents = [1, 2, 3, 4].map((id) => makeResident(id));
    const state = assignJobs(makeState(buildings, residents, { woodcutter: 1, farmer: 1, waterCarrier: 1 }));
    // waterCarrier before farmer before woodcutter, whatever the building order.
    expect(places(state)).toEqual([5, 4, 3, null]);
  });

  it("fills two buildings of one job in list order", () => {
    const buildings = [finished(4, "well"), finished(3, "well")];
    const residents = [1, 2, 3, 4, 5].map((id) => makeResident(id));
    expect(places(assignJobs(makeState(buildings, residents, { waterCarrier: 3 })))).toEqual([4, 4, 3, null, null]);
  });

  it("fills a wish number above the workplaces only as far as possible", () => {
    const residents = [1, 2, 3, 4].map((id) => makeResident(id));
    const state = assignJobs(makeState([finished(3, "well")], residents, { waterCarrier: 100 }));
    expect(places(state)).toEqual([3, 3, null, null]);
  });

  it("does not use a free adult for a job above its wish number", () => {
    const residents = [makeResident(1, { pinnedJob: "waterCarrier" }), makeResident(2)];
    const state = assignJobs(makeState([finished(3, "well")], residents, { waterCarrier: 1 }));
    expect(places(state)).toEqual([3, null]);
  });
});

describe("worked example (AC9)", () => {
  it("follows the agreed sequence", () => {
    let state = target(wellAndField(), "waterCarrier", 2);
    state = target(state, "farmer", 4);
    expect(places(state)).toEqual([3, 3, 4, 4, 4, 4, null, null]);

    state = target(state, "farmer", 2);
    expect(places(state)).toEqual([3, 3, 4, 4, null, null, null, null]);

    state = pin(state, 8, "farmer");
    expect(places(state)).toEqual([3, 3, 4, null, null, null, null, 4]);

    state = target(state, "farmer", 0);
    expect(places(state)).toEqual([3, 3, null, null, null, null, null, 4]);

    state = pin(state, 8, "miller");
    expect(places(state)).toEqual([3, 3, null, null, null, null, null, null]);
    // Also with room elsewhere resident 8 is not used for another job.
    state = target(state, "farmer", 4);
    expect(places(state)).toEqual([3, 3, 4, 4, 4, 4, null, null]);
  });
});

describe("consequences (AC8)", () => {
  /** Hand-made states from a fixed seed: random buildings, residents, pins and targets. */
  function randomState(seed: number): GameState {
    const random = createRandom(seed);
    const pick = <T>(items: readonly T[]): T => items[Math.floor(random.next() * items.length)] as T;
    const buildings: Building[] = Array.from({ length: 1 + Math.floor(random.next() * 6) }, (_, index) => ({
      id: index + 1,
      type: pick(BUILDING_TYPES),
      hoursLeft: random.next() < 0.75 ? 0 : 3,
    }));
    const residents = Array.from({ length: Math.floor(random.next() * 14) }, (_, index) =>
      makeResident(index + 1, {
        workplaceId: random.next() < 0.5 ? null : 1 + Math.floor(random.next() * 8),
        pinnedJob: random.next() < 0.3 ? pick(JOBS) : null,
        bornAtHour: random.next() < 0.15 ? -HOURS_PER_YEAR : -6 * HOURS_PER_YEAR,
      }),
    );
    const targets = Object.fromEntries(JOBS.map((job) => [job, Math.floor(random.next() * 5)])) as Record<Job, number>;
    return makeState(buildings, residents, targets);
  }

  const seeds = Array.from({ length: 300 }, (_, i) => i + 1);

  function slotsOf(state: GameState, job: Job): number {
    return state.buildings
      .filter((b) => b.hoursLeft === 0 && b.type === JOB_BUILDING[job])
      .reduce((sum, b) => sum + BUILDING_DEFINITIONS[b.type].workplaces, 0);
  }

  it("never puts more residents in a building than its workplaces", () => {
    for (const seed of seeds) {
      const state = assignJobs(randomState(seed));
      for (const building of state.buildings) {
        const count = state.residents.filter((r) => r.workplaceId === building.id).length;
        expect(count).toBeLessThanOrEqual(BUILDING_DEFINITIONS[building.type].workplaces);
      }
    }
  });

  it("only gives valid workplaces: adults, finished work buildings, the pinned job", () => {
    for (const seed of seeds) {
      const state = assignJobs(randomState(seed));
      for (const resident of state.residents) {
        if (resident.workplaceId === null) continue;
        const building = state.buildings.find((b) => b.id === resident.workplaceId);
        expect(building?.hoursLeft).toBe(0);
        expect(isAdult(resident, state.elapsedHours)).toBe(true);
        const job = building === undefined ? null : jobForBuilding(building.type);
        expect(job).not.toBeNull();
        if (resident.pinnedJob !== null) expect(job).toBe(resident.pinnedJob);
      }
    }
  });

  it("staffs each job with max(min(pinned, slots), min(target, slots)) when adults suffice", () => {
    let exactCases = 0;
    for (const seed of seeds) {
      const input = randomState(seed);
      const state = assignJobs(input);
      const adults = state.residents.filter((r) => isAdult(r, state.elapsedHours));
      const freeAdults = adults.filter((r) => r.pinnedJob === null).length;
      let autoDemand = 0;
      const expected = new Map<Job, number>();
      for (const job of JOBS) {
        const slots = slotsOf(state, job);
        const pinned = Math.min(adults.filter((r) => r.pinnedJob === job).length, slots);
        const wanted = Math.min(state.jobTargets[job], slots);
        expected.set(job, Math.max(pinned, wanted));
        autoDemand += Math.max(0, wanted - pinned);
      }
      for (const job of JOBS) {
        if (freeAdults >= autoDemand) {
          expect(workersOf(state, job)).toBe(expected.get(job));
        } else {
          expect(workersOf(state, job)).toBeLessThanOrEqual(expected.get(job) ?? 0);
        }
      }
      if (freeAdults >= autoDemand) exactCases++;
    }
    // Make sure the sweep really checks the exact formula often.
    expect(exactCases).toBeGreaterThan(50);
  });

  it("is idempotent and moves nobody on a second run", () => {
    for (const seed of seeds) {
      const once = assignJobs(randomState(seed));
      const twice = assignJobs(once);
      expect(twice).toStrictEqual(once);
      twice.residents.forEach((resident, index) => expect(resident).toBe(once.residents[index]));
    }
  });

  it("changes only workplaceId of residents", () => {
    const strip = (state: GameState) => ({
      ...state,
      residents: state.residents.map(({ workplaceId: _workplaceId, ...rest }) => rest),
    });
    for (const seed of seeds) {
      const input = randomState(seed);
      expect(strip(assignJobs(input))).toStrictEqual(strip(input));
    }
  });

  it("does not mutate its input", () => {
    for (const seed of seeds.slice(0, 50)) {
      const input = randomState(seed);
      const before = structuredClone(input);
      assignJobs(input);
      expect(input).toStrictEqual(before);
    }
  });

  it("shares unchanged residents with the input", () => {
    const state = assignJobs(makeState([finished(3, "well")], [makeResident(1), makeResident(2)], { waterCarrier: 1 }));
    const next = assignJobs(state);
    expect(next.residents[1]).toBe(state.residents[1]);
  });
});

describe("getJob", () => {
  it("gives the job of the workplace, or null", () => {
    const buildings = [finished(1, "house"), finished(3, "mill")];
    expect(getJob(buildings, makeResident(1, { workplaceId: 3 }))).toBe("miller");
    expect(getJob(buildings, makeResident(1, { workplaceId: 1 }))).toBeNull();
    expect(getJob(buildings, makeResident(1, { workplaceId: 99 }))).toBeNull();
    expect(getJob(buildings, makeResident(1))).toBeNull();
  });
});

describe("setJobTarget (AC10, AC12)", () => {
  it("sets the wish number and applies the distribution", () => {
    const state = target(wellAndField(), "farmer", 3);
    expect(state.jobTargets).toEqual({ ...zeroTargets(), farmer: 3 });
    expect(places(state)).toEqual([4, 4, 4, null, null, null, null, null]);
  });

  it("allows a wish number above the free workplaces", () => {
    const state = target(wellAndField(), "waterCarrier", 50);
    expect(state.jobTargets.waterCarrier).toBe(50);
    expect(workersOf(state, "waterCarrier")).toBe(2);
  });

  it("allows a wish number for a job without buildings", () => {
    const state = target(wellAndField(), "baker", 2);
    expect(state.jobTargets.baker).toBe(2);
    expect(places(state).every((id) => id === null)).toBe(true);
  });

  it("rejects counts that are not non-negative integers and changes nothing", () => {
    const state = wellAndField();
    const before = structuredClone(state);
    for (const count of [-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, -0.5]) {
      expect(setJobTarget(state, "farmer", count)).toEqual({ ok: false, reason: "invalidCount" });
    }
    expect(state).toStrictEqual(before);
  });

  it("never mutates its input on success", () => {
    const state = wellAndField();
    const before = structuredClone(state);
    const result = setJobTarget(state, "farmer", 2);
    expect(result.ok).toBe(true);
    expect(state).toStrictEqual(before);
  });
});

describe("setPinnedJob (AC11, AC12)", () => {
  it("pins a resident and applies the distribution", () => {
    const state = pin(wellAndField(), 5, "waterCarrier");
    expect(state.residents[4]?.pinnedJob).toBe("waterCarrier");
    expect(places(state)).toEqual([null, null, null, null, 3, null, null, null]);
  });

  it("releases a pin; the resident may keep the workplace as an automatic worker", () => {
    let state = target(wellAndField(), "farmer", 1);
    state = pin(state, 3, "farmer");
    expect(places(state)).toEqual([null, null, 4, null, null, null, null, null]);
    state = pin(state, 3, null);
    expect(state.residents[2]?.pinnedJob).toBeNull();
    expect(places(state)).toEqual([null, null, 4, null, null, null, null, null]);
  });

  it("releases a pin and frees the workplace when there is no wish number", () => {
    const state = pin(pin(wellAndField(), 3, "farmer"), 3, null);
    expect(places(state).every((id) => id === null)).toBe(true);
  });

  it("succeeds without change for null on an unpinned resident", () => {
    const state = target(wellAndField(), "farmer", 2);
    expect(pin(state, 1, null)).toStrictEqual(state);
  });

  it("rejects an unknown resident and changes nothing", () => {
    const state = wellAndField();
    const before = structuredClone(state);
    expect(setPinnedJob(state, 99, "farmer")).toEqual({ ok: false, reason: "unknownResident" });
    expect(setPinnedJob(state, 99, null)).toEqual({ ok: false, reason: "unknownResident" });
    expect(state).toStrictEqual(before);
  });

  it("rejects pinning a child, but allows releasing one", () => {
    const state = makeState([finished(3, "field")], [makeResident(1, { bornAtHour: -HOURS_PER_YEAR })]);
    const before = structuredClone(state);
    expect(setPinnedJob(state, 1, "farmer")).toEqual({ ok: false, reason: "notAdult" });
    expect(state).toStrictEqual(before);
    const released = setPinnedJob(state, 1, null);
    expect(released.ok).toBe(true);
  });

  it("never mutates its input on success", () => {
    const state = wellAndField();
    const before = structuredClone(state);
    expect(setPinnedJob(state, 2, "farmer").ok).toBe(true);
    expect(state).toStrictEqual(before);
  });
});

describe("assignment in the tick (AC13, AC14)", () => {
  it("staffs a new well at the end of its last build tick, producing from the next", () => {
    const ordered = orderBuilding(target(createInitialState(SEED), "waterCarrier", 1), "well");
    if (!ordered.ok) throw new Error(ordered.reason);
    let state = ordered.state;
    expect(state.buildings.at(-1)?.id).toBe(3);
    for (let t = 1; t < BUILDING_DEFINITIONS.well.buildHours; t++) {
      state = tick(state);
      expect(places(state).every((id) => id === null)).toBe(true);
    }
    state = tick(state);
    expect(state.elapsedHours).toBe(24);
    expect(places(state)).toEqual([3, null, null, null, null, null, null, null]);
    const water = state.storage.water;
    state = tick(state);
    expect(state.storage.water).toBe(water + 0.5);
  });

  it("staffs a building that finishes on a midnight tick", () => {
    const start = makeState([{ id: 3, type: "field", hoursLeft: 1 }], [makeResident(1)], { farmer: 1 }, HOURS_PER_DAY - 1);
    const midnight = tick(start);
    expect(midnight.elapsedHours % HOURS_PER_DAY).toBe(0);
    expect(places(midnight)).toEqual([3]);
    expect(midnight.storage.wheat).toBe(INITIAL_STORAGE.wheat);
    expect(tick(midnight).storage.wheat).toBe(INITIAL_STORAGE.wheat + 0.5);
  });

  it("stays pure and deterministic with targets and pins", () => {
    let state = pin(target(target(wellAndField(), "farmer", 3), "waterCarrier", 1), 8, "farmer");
    for (let i = 0; i < 60; i++) {
      const before = structuredClone(state);
      const next = tick(state);
      expect(state).toStrictEqual(before);
      expect(tick(state)).toStrictEqual(next);
      state = next;
    }
    expect(workersOf(state, "farmer")).toBe(3);
    expect(workersOf(state, "waterCarrier")).toBe(1);
  });
});

describe("plain data (AC15)", () => {
  const roundTrip = (state: GameState): unknown => JSON.parse(JSON.stringify(state));

  it("survives a JSON round trip with targets, pins and workplaces", () => {
    let state = target(target(wellAndField(), "farmer", 2), "waterCarrier", 2);
    state = pin(state, 7, "farmer");
    state = pin(state, 7, null);
    state = pin(state, 8, "miller");
    expect(roundTrip(state)).toStrictEqual(state);
    for (const count of [1, 24, 100]) {
      const later = tickTimes(state, count);
      expect(roundTrip(later)).toStrictEqual(later);
      expect(later.residents.some((r) => r.pinnedJob === "miller")).toBe(true);
      expect(later.residents.some((r) => r.workplaceId !== null)).toBe(true);
    }
  });
});
