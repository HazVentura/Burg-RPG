// What is missing right now, and where the problem starts (the bottleneck).
// "Missing" means current demand that cannot be met, not stock 0:
// - for production: a worker who would stay idle in the coming hour, found by
//   a dry run of the exact worker-hour loop of produceHour;
// - for residents: a daily good whose stock is below one ration per resident.

import type { BuildingType } from "./buildings";
import { GOODS, type Good } from "./goods";
import { JOB_BUILDING, JOBS } from "./jobs";
import { CONSUMED_GOODS, RATION_PER_DAY } from "./needs";
import { runWorkerHours } from "./production";
import { RECIPES } from "./productionConstants";
import { producersOf, recipeGoods } from "./productionChain";
import type { GameState } from "./state";

export interface Shortages {
  /** Every missing good, in GOODS order. */
  missing: Good[];
  /** Missing goods at the start of the problem, in GOODS order. */
  bottlenecks: Good[];
}

/** Pure: reads the state and never mutates it. */
export function findShortages(state: GameState): Shortages {
  const short = new Set<Good>(runWorkerHours(state.buildings, state.residents, state.storage).blockedBy);

  const residents = state.residents.length;
  if (residents > 0) {
    for (const good of CONSUMED_GOODS) {
      if (state.storage[good] < residents * RATION_PER_DAY[good]) short.add(good);
    }
  }

  const missing = GOODS.filter((good) => short.has(good));
  // A bottleneck is not explained by a missing input upstream: no job that
  // makes it is short of one of its inputs. A good no job makes is a bottleneck too.
  const bottlenecks = missing.filter(
    (good) =>
      !JOBS.some(
        (job) =>
          RECIPES[job].outputs[good] !== undefined &&
          recipeGoods(RECIPES[job].inputs).some((input) => short.has(input)),
      ),
  );
  return { missing, bottlenecks };
}

/**
 * The buildings whose absence explains why `good` is short: the building of
 * every job that makes `good`, but only when not one such building exists,
 * finished or under construction. Once any producer's building stands or is
 * being built, the cause lies elsewhere (no workers, inputs), so the result is
 * empty. A good no job makes also gives an empty result.
 * In JOBS order, without duplicates. Pure: never mutates the state.
 */
export function missingBuildingsFor(state: GameState, good: Good): BuildingType[] {
  const types = [...new Set(producersOf(good).map((job) => JOB_BUILDING[job]))];
  const anyExists = state.buildings.some((building) => types.includes(building.type));
  return anyExists ? [] : types;
}
