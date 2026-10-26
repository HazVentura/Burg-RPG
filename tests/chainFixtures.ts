// Hand-made states for the shortage and production chain tests.

import type { Building, BuildingType } from "../src/sim/buildings";
import { GOODS, type Storage } from "../src/sim/goods";
import { JOBS, type Job } from "../src/sim/jobs";
import type { Resident } from "../src/sim/residents";
import type { GameState } from "../src/sim/state";
import { HOURS_PER_YEAR } from "../src/sim/timeConstants";

export const SEED = 42;

export function makeResident(id: number, workplaceId: number | null): Resident {
  return {
    id,
    name: `R${id}`,
    sex: id % 2 === 1 ? "female" : "male",
    bornAtHour: -25 * HOURS_PER_YEAR,
    partnerId: null,
    needs: { bread: 100, water: 100 },
    workplaceId,
    pinnedJob: null,
  };
}

export function finished(id: number, type: BuildingType): Building {
  return { id, type, hoursLeft: 0 };
}

export function storageWith(goods: Partial<Storage> = {}): Storage {
  const storage = Object.fromEntries(GOODS.map((good) => [good, 0])) as Storage;
  return { ...storage, ...goods };
}

/** A state at hour 1 of day 1 with the given buildings, residents and storage. */
export function makeState(buildings: Building[], residents: Resident[], storage: Storage): GameState {
  return {
    elapsedHours: 1,
    rngState: 123,
    storage,
    residents,
    nextResidentId: Math.max(0, ...residents.map((r) => r.id)) + 1,
    buildings,
    nextBuildingId: Math.max(0, ...buildings.map((b) => b.id)) + 1,
    jobTargets: Object.fromEntries(JOBS.map((job) => [job, 0])) as Record<Job, number>,
    chronicle: [],
    nextChronicleId: 0,
  };
}

/**
 * AC5 example: a staffed mill and a staffed bakery, no field. Wheat and flour
 * are 0, so the miller and the baker are blocked, and bread is below the two
 * residents' need.
 */
export function wheatChainState(): GameState {
  return makeState(
    [finished(3, "mill"), finished(4, "bakery")],
    [makeResident(1, 3), makeResident(2, 4)],
    storageWith({ water: 10, wood: 10 }),
  );
}

/** AC5 example: the baker has flour but neither water nor wood; one resident has bread. */
export function waterAndWoodState(): GameState {
  return makeState([finished(3, "bakery")], [makeResident(1, 3)], storageWith({ flour: 10, bread: 10 }));
}
