import { BUILDING_DEFINITIONS } from "../src/sim/buildingConstants";
import { BUILDING_TYPES, type Building, type BuildingType } from "../src/sim/buildings";
import { orderBuilding } from "../src/sim/commands";
import { GOODS, type Good, type Storage } from "../src/sim/goods";
import { JOB_BUILDING, JOBS, jobForBuilding, type Job } from "../src/sim/jobs";
import { BREAD_PER_RESIDENT_PER_DAY, WATER_PER_RESIDENT_PER_DAY } from "../src/sim/needConstants";
import { consumeDailyFood } from "../src/sim/needs";
import { produceHour } from "../src/sim/production";
import { RECIPES } from "../src/sim/productionConstants";
import type { Resident } from "../src/sim/residents";
import { createInitialState, tick, type GameState } from "../src/sim/state";
import { INITIAL_STORAGE } from "../src/sim/storageConstants";
import { DAYS_PER_SEASON, HOURS_PER_DAY, HOURS_PER_YEAR, SEASONS } from "../src/sim/timeConstants";
import { getCalendar } from "../src/sim/calendar";

const SEED = 42;

function tickTimes(state: GameState, count: number): GameState {
  let current = state;
  for (let i = 0; i < count; i++) {
    current = tick(current);
  }
  return current;
}

function makeResident(id: number, workplaceId: number | null): Resident {
  return {
    id,
    name: `R${id}`,
    sex: id % 2 === 1 ? "female" : "male",
    bornAtHour: -5 * HOURS_PER_YEAR,
    partnerId: null,
    needs: { bread: 100, water: 100 },
    workplaceId,
    pinnedJob: null,
  };
}

function finished(id: number, type: BuildingType): Building {
  return { id, type, hoursLeft: 0 };
}

function emptyStorage(goods: Partial<Storage> = {}): Storage {
  const storage = Object.fromEntries(GOODS.map((good) => [good, 0])) as Storage;
  return { ...storage, ...goods };
}

/**
 * Wish numbers that keep a hand-made staffing as it is under assignJobs: per job,
 * the residents whose workplaceId points to a building of that job (finished or not).
 * So nobody is released, and nobody idle is moved into a job.
 */
function targetsFor(buildings: readonly Building[], residents: readonly Resident[]): Record<Job, number> {
  const targets = Object.fromEntries(JOBS.map((job) => [job, 0])) as Record<Job, number>;
  for (const resident of residents) {
    const building = buildings.find((b) => b.id === resident.workplaceId);
    const job = building === undefined ? null : jobForBuilding(building.type);
    if (job !== null) targets[job] += 1;
  }
  return targets;
}

/** A hand-made state at hour 1 of day 1, so one tick is never a midnight tick. */
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
  };
}

function output(job: Job, good: Good): number {
  const amount = RECIPES[job].outputs[good];
  if (amount === undefined) throw new Error(`${job} makes no ${good}`);
  return amount;
}

function input(job: Job, good: Good): number {
  const amount = RECIPES[job].inputs[good];
  if (amount === undefined) throw new Error(`${job} uses no ${good}`);
  return amount;
}

describe("jobs", () => {
  it("lists exactly the five starting jobs", () => {
    expect(JOBS).toEqual(["waterCarrier", "farmer", "miller", "baker", "woodcutter"]);
  });

  it("maps each job to its work building", () => {
    expect(JOB_BUILDING).toEqual({
      waterCarrier: "well",
      farmer: "field",
      miller: "mill",
      baker: "bakery",
      woodcutter: "woodcutterHut",
    });
    expect(Object.isFrozen(JOB_BUILDING)).toBe(true);
  });

  it("gives every building with workplaces exactly one job, and the house none", () => {
    for (const type of BUILDING_TYPES) {
      const jobs = JOBS.filter((job) => JOB_BUILDING[job] === type);
      if (BUILDING_DEFINITIONS[type].workplaces > 0) {
        expect(jobs).toHaveLength(1);
        expect(jobForBuilding(type)).toBe(jobs[0]);
      } else {
        expect(jobs).toHaveLength(0);
        expect(jobForBuilding(type)).toBeNull();
      }
    }
    expect(jobForBuilding("house")).toBeNull();
  });
});

describe("recipes", () => {
  it("has the agreed start values", () => {
    expect(RECIPES).toEqual({
      waterCarrier: { inputs: {}, outputs: { water: 0.5 } },
      farmer: { inputs: {}, outputs: { wheat: 0.5 } },
      miller: { inputs: { wheat: 0.5 }, outputs: { flour: 0.5 } },
      baker: { inputs: { flour: 0.25, water: 0.25, wood: 0.125 }, outputs: { bread: 0.5 } },
      woodcutter: { inputs: {}, outputs: { wood: 0.5 } },
    });
  });

  it("has one recipe per job, frozen including nested maps", () => {
    expect(Object.keys(RECIPES).sort()).toEqual([...JOBS].sort());
    expect(Object.isFrozen(RECIPES)).toBe(true);
    for (const job of JOBS) {
      expect(Object.isFrozen(RECIPES[job])).toBe(true);
      expect(Object.isFrozen(RECIPES[job].inputs)).toBe(true);
      expect(Object.isFrozen(RECIPES[job].outputs)).toBe(true);
    }
  });

  it("uses positive multiples of 1/8, at least one output, no good on both sides, no tools", () => {
    for (const job of JOBS) {
      const { inputs, outputs } = RECIPES[job];
      expect(Object.keys(outputs).length).toBeGreaterThan(0);
      for (const map of [inputs, outputs]) {
        for (const [good, amount] of Object.entries(map)) {
          expect(GOODS).toContain(good);
          expect(Number.isInteger(amount * 8)).toBe(true);
          expect(amount * 8).toBeGreaterThan(0);
          expect(good).not.toBe("tools");
        }
      }
      for (const good of Object.keys(inputs)) {
        expect(Object.keys(outputs)).not.toContain(good);
      }
    }
  });
});

describe("workplaceId on residents", () => {
  it("starts null for every settler, for several seeds", () => {
    for (const seed of [SEED, 0, -1]) {
      for (const resident of createInitialState(seed).residents) {
        expect(resident.workplaceId).toBeNull();
      }
    }
  });

  it("keeps rngState and settlers unchanged, apart from the new field", () => {
    // Values recorded from main before this job (seed 42).
    const state = createInitialState(SEED);
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

  it("leaves a new game exactly as daily consumption alone would, over 100 days", () => {
    // Without workers, a tick is only the clock plus consumption at midnight.
    let state = createInitialState(SEED);
    let storage = state.storage;
    let residents = state.residents;
    for (let hour = 1; hour <= 100 * HOURS_PER_DAY; hour++) {
      state = tick(state);
      if (hour % HOURS_PER_DAY === 0) {
        ({ storage, residents } = consumeDailyFood(residents, storage));
      }
      expect(state.storage).toEqual(storage);
    }
    expect(state.residents).toEqual(residents);
    expect(state.buildings).toEqual(createInitialState(SEED).buildings);
  });
});

describe("who works", () => {
  const storage = emptyStorage();

  it("lets a resident in a finished well work", () => {
    const result = produceHour([finished(3, "well")], [makeResident(1, 3)], storage);
    expect(result.water).toBe(output("waterCarrier", "water"));
  });

  it("ignores null, unknown ids, houses and buildings under construction, without throwing", () => {
    const buildings: Building[] = [finished(1, "house"), { id: 2, type: "well", hoursLeft: 5 }];
    const residents = [makeResident(1, null), makeResident(2, 99), makeResident(3, 1), makeResident(4, 2)];
    expect(produceHour(buildings, residents, storage)).toEqual(storage);
    const state = makeState(buildings, residents, storage);
    const next = tick(state);
    expect(next.storage).toEqual(storage);
    // Since job assignment runs in tick, these invalid workplaces are cleared afterwards.
    expect(next.residents.map((r) => r.workplaceId)).toEqual([null, null, null, null]);
  });

  it("caps workers per building at its workplaces, first in list order", () => {
    const wellPlaces = BUILDING_DEFINITIONS.well.workplaces;
    const residents = Array.from({ length: wellPlaces + 1 }, (_, i) => makeResident(i + 1, 3));
    const result = produceHour([finished(3, "well")], residents, storage);
    expect(result.water).toBe(wellPlaces * output("waterCarrier", "water"));
    expect(result.water).toBe(1);
  });

  it("caps per building, so the third resident does not take a free place elsewhere", () => {
    // Residents 1 to 3 point at well 3, resident 4 at well 4.
    const residents = [makeResident(1, 3), makeResident(2, 3), makeResident(3, 3), makeResident(4, 4)];
    const result = produceHour([finished(3, "well"), finished(4, "well")], residents, storage);
    expect(result.water).toBe(3 * output("waterCarrier", "water"));
  });

  it("caps workers the same way when resident ids are not in list order", () => {
    const residents = [makeResident(9, 3), makeResident(1, 3), makeResident(2, 3)];
    const result = produceHour([finished(3, "mill")], residents, emptyStorage({ wheat: 10 }));
    expect(result.flour).toBe(BUILDING_DEFINITIONS.mill.workplaces * output("miller", "flour"));
  });

  it("serves two buildings of the same type each with their own workers", () => {
    const residents = [makeResident(1, 3), makeResident(2, 4), makeResident(3, 4)];
    const result = produceHour([finished(3, "field"), finished(4, "field")], residents, storage);
    expect(result.wheat).toBe(3 * output("farmer", "wheat"));
  });

  it("handles an empty resident list and an empty building list", () => {
    expect(produceHour([finished(3, "well")], [], storage)).toEqual(storage);
    expect(produceHour([], [makeResident(1, 3)], storage)).toEqual(storage);
  });

  it("first produces on the tick after construction finishes", () => {
    const ordered = orderBuilding(createInitialState(SEED), "well");
    if (!ordered.ok) throw new Error("order failed");
    const wellId = ordered.state.nextBuildingId - 1;
    expect(wellId).toBe(3);
    // One water carrier wanted: resident 1 is staffed once the well is finished.
    const start: GameState = {
      ...ordered.state,
      jobTargets: { ...ordered.state.jobTargets, waterCarrier: 1 },
    };
    const buildHours = BUILDING_DEFINITIONS.well.buildHours;
    expect(buildHours).toBe(24);
    const residentsCount = start.residents.length;

    let state = start;
    for (let t = 1; t <= buildHours; t++) {
      state = tick(state);
      // Tick 24 is a midnight tick, so water only drops by the daily drink.
      const drunk = t >= HOURS_PER_DAY ? residentsCount * WATER_PER_RESIDENT_PER_DAY : 0;
      expect(state.storage.water).toBe(INITIAL_STORAGE.water - drunk);
    }
    expect(state.buildings.find((b) => b.id === wellId)?.hoursLeft).toBe(0);
    const before = state.storage.water;
    state = tick(state);
    expect(state.storage.water).toBe(before + output("waterCarrier", "water"));
  });

  it("produces from the first hour of the next day when a building finishes on a midnight tick", () => {
    // Field with 1 hour left at hour 23: it finishes on the midnight tick, not producing yet.
    const state = makeState(
      [{ id: 3, type: "field", hoursLeft: 1 }],
      [makeResident(1, 3)],
      emptyStorage({ bread: 10, water: 10 }),
      HOURS_PER_DAY - 1,
    );
    const midnight = tick(state);
    expect(midnight.storage.wheat).toBe(0);
    expect(midnight.buildings[0]?.hoursLeft).toBe(0);
    expect(tick(midnight).storage.wheat).toBe(output("farmer", "wheat"));
  });

  it("ignores age, sex, partner and needs, every hour of the day", () => {
    // produceHour itself ignores age; only job assignment keeps children out of work.
    const newborn: Resident = { ...makeResident(1, 3), bornAtHour: 0, needs: { bread: 0, water: 0 } };
    const elder: Resident = { ...makeResident(2, 4), sex: "male", bornAtHour: -80 * HOURS_PER_YEAR, partnerId: 1 };
    const huts = [finished(3, "woodcutterHut"), finished(4, "woodcutterHut")];
    expect(produceHour(huts, [newborn, elder], emptyStorage()).wood).toBe(2 * output("woodcutter", "wood"));
    // Through tick: a hungry adult instead of the newborn, who would lose the workplace.
    const hungry: Resident = { ...makeResident(1, 3), needs: { bread: 0, water: 0 } };
    let state = makeState(huts, [hungry, elder], emptyStorage(), 0);
    for (let hour = 0; hour < HOURS_PER_DAY; hour++) {
      const before = state.storage.wood;
      state = tick(state);
      expect(state.storage.wood).toBe(before + 2 * output("woodcutter", "wood"));
    }
  });
});

describe("one hour of production", () => {
  it("takes inputs and adds outputs when inputs are exactly enough", () => {
    const storage = emptyStorage({
      flour: input("baker", "flour"),
      water: input("baker", "water"),
      wood: input("baker", "wood"),
    });
    const result = produceHour([finished(3, "bakery")], [makeResident(1, 3)], storage);
    expect(result).toEqual(emptyStorage({ bread: output("baker", "bread") }));
  });

  it("takes nothing when one of three baker inputs is short", () => {
    const full = { flour: 10, water: 10, wood: 10 };
    for (const short of ["flour", "water", "wood"] as const) {
      const storage = emptyStorage({ ...full, [short]: input("baker", short) - 0.125 });
      const result = produceHour([finished(3, "bakery")], [makeResident(1, 3)], storage);
      expect(result).toEqual(storage);
    }
  });

  it("lets the first baker bake and the second idle when flour runs out (AC13)", () => {
    const storage = emptyStorage({ flour: 0.25, water: 10, wood: 10 });
    const result = produceHour([finished(3, "bakery")], [makeResident(1, 3), makeResident(2, 3)], storage);
    expect(result.flour).toBe(0);
    expect(result.bread).toBe(output("baker", "bread"));
    expect(result.water).toBe(10 - input("baker", "water"));
    expect(result.wood).toBe(10 - input("baker", "wood"));
  });

  it("runs buildings in list order: bakery before mill (AC12)", () => {
    const residents = [makeResident(1, 3), makeResident(2, 4)];
    const start = makeState(
      [finished(3, "bakery"), finished(4, "mill")],
      residents,
      emptyStorage({ wheat: 0.5, water: 10, wood: 10 }),
    );
    const t1 = tick(start);
    expect(t1.storage.wheat).toBe(0);
    expect(t1.storage.flour).toBe(0.5);
    expect(t1.storage.bread).toBe(0);
    const t2 = tick(t1);
    expect(t2.storage.flour).toBe(0.25);
    expect(t2.storage.bread).toBe(0.5);
    expect(t2.storage.wheat).toBe(0);
  });

  it("runs buildings in list order: mill before bakery bakes on tick 1 (AC12)", () => {
    const residents = [makeResident(1, 3), makeResident(2, 4)];
    const start = makeState(
      [finished(4, "mill"), finished(3, "bakery")],
      residents,
      emptyStorage({ wheat: 0.5, water: 10, wood: 10 }),
    );
    const t1 = tick(start);
    expect(t1.storage.wheat).toBe(0);
    expect(t1.storage.flour).toBe(0.25);
    expect(t1.storage.bread).toBe(0.5);
  });

  it("never lets storage go below zero", () => {
    const buildings = [finished(3, "bakery"), finished(4, "mill"), finished(5, "bakery")];
    const residents = [makeResident(1, 3), makeResident(2, 3), makeResident(3, 4), makeResident(4, 5)];
    let state = makeState(buildings, residents, emptyStorage({ wheat: 1, water: 1, wood: 1 }));
    for (let i = 0; i < 48; i++) {
      state = tick(state);
      for (const value of Object.values(state.storage)) expect(value).toBeGreaterThanOrEqual(0);
    }
  });

  it("makes wheat at the same rate in every season, with no inputs (AC14)", () => {
    const seasonsSeen: string[] = [];
    SEASONS.forEach((_, index) => {
      // Hour 5 of the third day of each season.
      const hour = (index * DAYS_PER_SEASON + 2) * HOURS_PER_DAY + 5;
      const state = makeState([finished(3, "field")], [makeResident(1, 3)], emptyStorage(), hour);
      seasonsSeen.push(getCalendar(state).season);
      const next = tick(state);
      expect(next.storage).toEqual(emptyStorage({ wheat: output("farmer", "wheat") }));
    });
    expect(seasonsSeen).toEqual(["spring", "summer", "autumn", "winter"]);
  });

  it("only changes storage (AC15)", () => {
    const buildings = [finished(3, "well"), finished(4, "mill")];
    const residents = [makeResident(1, 3), makeResident(2, 4)];
    const state = makeState(buildings, residents, emptyStorage({ wheat: 5 }));
    const next = tick(state);
    expect(next.storage).not.toEqual(state.storage);
    expect(next.residents).toEqual(state.residents);
    expect(next.buildings).toEqual(state.buildings);
    expect(next.rngState).toBe(state.rngState);
    expect(next.nextResidentId).toBe(state.nextResidentId);
    expect(next.nextBuildingId).toBe(state.nextBuildingId);
  });
});

describe("production inside tick (AC16)", () => {
  function pinnedStart(): GameState {
    const initial = createInitialState(SEED);
    return {
      ...initial,
      buildings: [...initial.buildings, finished(3, "well")],
      nextBuildingId: 4,
      residents: initial.residents.map((r) => (r.id === 1 ? { ...r, workplaceId: 3 } : r)),
      jobTargets: { ...initial.jobTargets, waterCarrier: 1 },
    };
  }

  it("adds 0.5 water in the first hour", () => {
    expect(tick(pinnedStart()).storage.water).toBe(40.5);
  });

  it("produces in hour 23 to 0 before the midnight drink", () => {
    const state = tickTimes(pinnedStart(), HOURS_PER_DAY);
    expect(state.storage.water).toBe(44);
    expect(state.storage.bread).toBe(52);
    expect(state.residents.every((r) => r.needs.water === 100 && r.needs.bread === 100)).toBe(true);
  });

  it("lets the last hour's water reach the midnight drink", () => {
    // Exactly one water short before the last hour, and the last hour makes it up.
    const residents = [makeResident(1, 3), makeResident(2, null)];
    const state = makeState([finished(3, "well")], residents, emptyStorage({ bread: 2, water: 1.5 }), HOURS_PER_DAY - 1);
    const next = tick(state);
    expect(next.storage.water).toBe(0);
    expect(next.residents.map((r) => r.needs.water)).toEqual([100, 100]);
  });

  it("keeps construction working as before while workers produce", () => {
    const state = makeState(
      [finished(3, "well"), { id: 4, type: "mill", hoursLeft: 3 }],
      [makeResident(1, 3), makeResident(2, 4)],
      emptyStorage({ wheat: 10 }),
    );
    const next = tickTimes(state, 3);
    expect(next.buildings.map((b) => b.hoursLeft)).toEqual([0, 0]);
    expect(next.storage.flour).toBe(0);
    expect(tick(next).storage.flour).toBe(output("miller", "flour"));
  });
});

describe("purity, determinism, plain data", () => {
  function allFiveState(): GameState {
    const types: BuildingType[] = ["well", "field", "mill", "bakery", "woodcutterHut"];
    const buildings = types.map((type, index) => finished(index + 3, type));
    const residents = [...buildings.map((b, index) => makeResident(index + 1, b.id)), makeResident(6, null)];
    return makeState(buildings, residents, emptyStorage({ wheat: 1, flour: 1, water: 1, wood: 1, bread: 10 }));
  }

  it("never mutates its input, and gives deep-equal results for the same input", () => {
    let state = allFiveState();
    for (let i = 0; i < 50; i++) {
      const before = structuredClone(state);
      const next = tick(state);
      expect(state).toStrictEqual(before);
      expect(tick(state)).toStrictEqual(next);
      state = next;
    }
  });

  it("does not mutate the inputs of produceHour", () => {
    const { buildings, residents, storage } = allFiveState();
    const before = structuredClone({ buildings, residents, storage });
    const result = produceHour(buildings, residents, storage);
    expect({ buildings, residents, storage }).toStrictEqual(before);
    expect(result).not.toBe(storage);
  });

  it("survives a JSON round trip with workers in all five building types", () => {
    let state = allFiveState();
    for (const count of [0, 1, 5, 23, 24, 100]) {
      const current = tickTimes(state, count);
      expect(JSON.parse(JSON.stringify(current))).toStrictEqual(current);
      expect(current.residents.some((r) => r.workplaceId === null)).toBe(true);
      expect(current.residents.some((r) => typeof r.workplaceId === "number")).toBe(true);
    }
    state = tickTimes(state, 3);
    expect(Object.values(state.storage).some((value) => !Number.isInteger(value))).toBe(true);
  });

  it("keeps storage exact over a 960-tick chain (AC19)", () => {
    // Buildings in chain order, so field and mill supply the mill and bakery in the same hour.
    const types: BuildingType[] = ["well", "field", "mill", "bakery", "woodcutterHut"];
    const buildings = types.map((type, index) => finished(index + 3, type));
    const residents = buildings.map((b, index) => makeResident(index + 1, b.id));
    const start = makeState(buildings, residents, { ...INITIAL_STORAGE }, 0);

    const hours = HOURS_PER_YEAR;
    const days = hours / HOURS_PER_DAY;
    const people = residents.length;
    const end = tickTimes(start, hours);

    const perHour = (good: Good): number => {
      let net = 0;
      for (const job of JOBS) {
        net += (RECIPES[job].outputs[good] ?? 0) - (RECIPES[job].inputs[good] ?? 0);
      }
      return net;
    };
    const eaten: Partial<Record<Good, number>> = {
      bread: days * people * BREAD_PER_RESIDENT_PER_DAY,
      water: days * people * WATER_PER_RESIDENT_PER_DAY,
    };
    for (const good of GOODS) {
      expect(end.storage[good]).toBe(INITIAL_STORAGE[good] + hours * perHour(good) - (eaten[good] ?? 0));
    }
    // Pinned to catch a wrong formula: wheat stays 0, flour grows by 0.25 an hour.
    expect(end.storage.wheat).toBe(0);
    expect(end.storage.flour).toBe(240);
    expect(end.storage.wood).toBe(INITIAL_STORAGE.wood + 360);
    expect(end.residents.every((r) => r.needs.bread === 100 && r.needs.water === 100)).toBe(true);
  });
});
