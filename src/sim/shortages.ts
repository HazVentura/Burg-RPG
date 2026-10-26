// What is missing right now, and where the problem starts (the bottleneck).
// "Missing" means current demand that cannot be met, not stock 0:
// - for production: a worker who would stay idle in the coming hour, found by
//   a dry run of the exact worker-hour loop of produceHour;
// - for residents: a daily good whose stock is below one ration per resident.

import { GOODS, type Good } from "./goods";
import { JOBS } from "./jobs";
import { CONSUMED_GOODS, RATION_PER_DAY } from "./needs";
import { runWorkerHours } from "./production";
import { RECIPES } from "./productionConstants";
import { recipeGoods } from "./productionChain";
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
