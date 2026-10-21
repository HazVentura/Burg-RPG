// One hour of work: every worker in a finished work building does one
// worker-hour of their job's recipe, using the central castle storage.

import { getBuildingDefinition } from "./buildingConstants";
import { isFinished, type Building } from "./buildings";
import type { Good, Storage } from "./goods";
import { jobForBuilding } from "./jobs";
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
 * One game hour of production. Worker-hours run one after the other: buildings
 * in list order, the workers of one building in resident order, so outputs of
 * an earlier worker-hour are available to later ones. A worker whose inputs are
 * not all fully in storage produces nothing and takes nothing.
 * Returns a new storage; the inputs are never mutated.
 */
export function produceHour(
  buildings: readonly Building[],
  residents: readonly Resident[],
  storage: Readonly<Storage>,
): Storage {
  const workers = countWorkers(buildings, residents);
  const next: Storage = { ...storage };

  for (const building of buildings) {
    const count = workers.get(building.id) ?? 0;
    const job = jobForBuilding(building.type);
    if (count === 0 || job === null) continue;
    const inputs = amounts(RECIPES[job].inputs);
    const outputs = amounts(RECIPES[job].outputs);
    for (let worker = 0; worker < count; worker++) {
      if (!inputs.every(([good, amount]) => next[good] >= amount)) continue;
      for (const [good, amount] of inputs) next[good] -= amount;
      for (const [good, amount] of outputs) next[good] += amount;
    }
  }

  return next;
}
