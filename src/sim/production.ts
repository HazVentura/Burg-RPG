// One hour of work: every worker in a finished work building does one
// worker-hour of their job's recipe, using the central castle storage.

import { getBuildingDefinition } from "./buildingConstants";
import { isFinished, type Building } from "./buildings";
import type { Good, Storage } from "./goods";
import { JOBS, jobForBuilding, type Job } from "./jobs";
import { RECIPES, type Recipe } from "./productionConstants";
import type { Resident } from "./residents";

/** Map entries with a defined amount; a missing good is not part of the recipe. */
function amounts(map: Recipe["inputs"]): [Good, number][] {
  const entries: [Good, number][] = [];
  for (const [good, amount] of Object.entries(map) as [Good, number | undefined][]) {
    if (amount !== undefined) entries.push([good, amount]);
  }
  return entries;
}

/**
 * Counts the residents who work in each building this hour: the first
 * `workplaces` residents in list order whose workplaceId points to a finished
 * work building. Everyone else (no workplace, unknown id, house, construction
 * site, or a full building) does not work and keeps their workplaceId.
 */
function countWorkers(buildings: readonly Building[], residents: readonly Resident[]): Map<number, number> {
  const capacity = new Map<number, number>();
  for (const building of buildings) {
    if (isFinished(building) && jobForBuilding(building.type) !== null) {
      capacity.set(building.id, getBuildingDefinition(building.type).workplaces);
    }
  }
  const workers = new Map<number, number>();
  for (const resident of residents) {
    if (resident.workplaceId === null) continue;
    const limit = capacity.get(resident.workplaceId);
    if (limit === undefined) continue;
    const count = workers.get(resident.workplaceId) ?? 0;
    if (count < limit) workers.set(resident.workplaceId, count + 1);
  }
  return workers;
}

/**
 * Residents working at each job this hour, with the same count produceHour uses:
 * the sum over all buildings of that job, each capped at its workplaces.
 */
export function countWorkersByJob(buildings: readonly Building[], residents: readonly Resident[]): Record<Job, number> {
  const workers = countWorkers(buildings, residents);
  const byJob = Object.fromEntries(JOBS.map((job) => [job, 0])) as Record<Job, number>;
  for (const building of buildings) {
    const job = jobForBuilding(building.type);
    if (job !== null) byJob[job] += workers.get(building.id) ?? 0;
  }
  return byJob;
}

/** Result of one hour of worker-hours. */
export interface WorkerHoursResult {
  /** The storage after every worker-hour; a new object. */
  storage: Storage;
  /**
   * Goods some worker could not work for: every input whose stock was below the
   * recipe amount at the turn of a worker who stayed idle. Workers who worked add nothing.
   */
  blockedBy: Set<Good>;
}

/**
 * The worker-hour loop shared by produceHour and the shortage check, so both
 * follow exactly the same rules. Worker-hours run one after the other:
 * buildings in list order, the workers of one building in resident order, so
 * outputs of an earlier worker-hour are available to later ones. A worker whose
 * inputs are not all fully in storage produces nothing and takes nothing.
 * The inputs are never mutated.
 */
export function runWorkerHours(
  buildings: readonly Building[],
  residents: readonly Resident[],
  storage: Readonly<Storage>,
): WorkerHoursResult {
  const workers = countWorkers(buildings, residents);
  const next: Storage = { ...storage };
  const blockedBy = new Set<Good>();

  for (const building of buildings) {
    const count = workers.get(building.id) ?? 0;
    const job = jobForBuilding(building.type);
    if (count === 0 || job === null) continue;
    const inputs = amounts(RECIPES[job].inputs);
    const outputs = amounts(RECIPES[job].outputs);
    for (let worker = 0; worker < count; worker++) {
      const short = inputs.filter(([good, amount]) => next[good] < amount);
      if (short.length > 0) {
        for (const [good] of short) blockedBy.add(good);
        continue;
      }
      for (const [good, amount] of inputs) next[good] -= amount;
      for (const [good, amount] of outputs) next[good] += amount;
    }
  }

  return { storage: next, blockedBy };
}

/**
 * One game hour of production (see runWorkerHours for the order and rules).
 * Returns a new storage; the inputs are never mutated.
 */
export function produceHour(
  buildings: readonly Building[],
  residents: readonly Resident[],
  storage: Readonly<Storage>,
): Storage {
  return runWorkerHours(buildings, residents, storage).storage;
}
