// One hour of work: every worker in a finished work building does one
// worker-hour of their job's recipe, using the central castle storage.

import { getBuildingDefinition } from "./buildingConstants";
import { isFinished, type Building } from "./buildings";
import type { Season } from "./calendar";
import { GROWING_SEASONS, HARVEST_PER_FARMER_HOUR, HARVEST_SEASON } from "./farmingConstants";
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
  /** The wheat on the fields after every worker-hour (see farmerHour). */
  fieldWheat: number;
  /**
   * Goods some worker could not work for: every input whose stock was below the
   * recipe amount at the turn of a worker who stayed idle. Workers who worked add nothing.
   */
  blockedBy: Set<Good>;
}

/**
 * One farmer worker-hour, by season. The farmer is the only job that follows
 * the seasons, and the only one that touches the wheat on the fields:
 * - growing seasons: the recipe output grows on the fields, not in storage;
 * - harvest season: up to HARVEST_PER_FARMER_HOUR moves from the fields into storage;
 * - any other season (winter): the fields rest and nothing happens.
 * Writes into `storage` (the loop's private copy) and returns the new field wheat.
 */
function farmerHour(season: Season, storage: Storage, fieldWheat: number): number {
  if (GROWING_SEASONS.includes(season)) {
    return fieldWheat + (RECIPES.farmer.outputs.wheat ?? 0);
  }
  if (season === HARVEST_SEASON) {
    const harvested = Math.min(HARVEST_PER_FARMER_HOUR, fieldWheat);
    storage.wheat += harvested;
    return fieldWheat - harvested;
  }
  return fieldWheat;
}

/**
 * Wheat left on the fields at the end of an hour. Outside the growing and
 * harvest seasons the fields rest, and wheat not harvested by the end of the
 * harvest season is lost.
 */
function fieldWheatAfterHour(season: Season, fieldWheat: number): number {
  return GROWING_SEASONS.includes(season) || season === HARVEST_SEASON ? fieldWheat : 0;
}

/**
 * The worker-hour loop shared by produceHour and the shortage check, so both
 * follow exactly the same rules. Worker-hours run one after the other:
 * buildings in list order, the workers of one building in resident order, so
 * outputs of an earlier worker-hour are available to later ones. A worker whose
 * inputs are not all fully in storage produces nothing and takes nothing.
 * Farmers follow the season of the hour instead of their recipe (farmerHour).
 * The inputs are never mutated.
 */
export function runWorkerHours(
  buildings: readonly Building[],
  residents: readonly Resident[],
  storage: Readonly<Storage>,
  season: Season,
  fieldWheat: number,
): WorkerHoursResult {
  const workers = countWorkers(buildings, residents);
  const next: Storage = { ...storage };
  let field = fieldWheat;
  const blockedBy = new Set<Good>();

  for (const building of buildings) {
    const count = workers.get(building.id) ?? 0;
    const job = jobForBuilding(building.type);
    if (count === 0 || job === null) continue;
    if (job === "farmer") {
      for (let worker = 0; worker < count; worker++) field = farmerHour(season, next, field);
      continue;
    }
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

  return { storage: next, fieldWheat: fieldWheatAfterHour(season, field), blockedBy };
}

/** Result of one game hour of production. */
export interface ProductionResult {
  storage: Storage;
  fieldWheat: number;
}

/**
 * One game hour of production (see runWorkerHours for the order and rules).
 * `season` is the season of the hour the tick starts in.
 * Returns a new storage; the inputs are never mutated.
 */
export function produceHour(
  buildings: readonly Building[],
  residents: readonly Resident[],
  storage: Readonly<Storage>,
  season: Season,
  fieldWheat: number,
): ProductionResult {
  const { storage: next, fieldWheat: field } = runWorkerHours(buildings, residents, storage, season, fieldWheat);
  return { storage: next, fieldWheat: field };
}
