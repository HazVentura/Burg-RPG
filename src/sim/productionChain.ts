// The production chain (docs/vision.md, section 5): which job makes which good
// and which job uses which. Derived from RECIPES, so a job added later (miner,
// smith) appears in the chain without changes here.

import { GOODS, type Good } from "./goods";
import { JOBS, type Job } from "./jobs";
import { RECIPES, type Recipe } from "./productionConstants";

/** One job in the chain with the goods it uses and makes, each in GOODS order. */
export interface ChainStep {
  job: Job;
  inputs: Good[];
  outputs: Good[];
}

/** Goods of a recipe map, in GOODS order. */
export function recipeGoods(map: Recipe["inputs"]): Good[] {
  return GOODS.filter((good) => map[good] !== undefined);
}

/** Jobs whose recipe makes `good`, in JOBS order. */
export function producersOf(good: Good): Job[] {
  return JOBS.filter((job) => RECIPES[job].outputs[good] !== undefined);
}

/**
 * The job steps in chain order: jobs without inputs first, then each job after
 * every job that produces one of its inputs; ties in JOBS order.
 * Built in layers: a layer holds every job (in JOBS order) whose input producers
 * are all in earlier layers. If a cycle leaves no job placeable, the rest follow
 * in JOBS order, so this never loops forever.
 */
export function getProductionChain(): ChainStep[] {
  const placed = new Set<Job>();
  const order: Job[] = [];
  while (order.length < JOBS.length) {
    const layer = JOBS.filter(
      (job) =>
        !placed.has(job) &&
        recipeGoods(RECIPES[job].inputs).every((good) =>
          // A job's own output never holds it back; only other producers count.
          producersOf(good).every((producer) => producer === job || placed.has(producer)),
        ),
    );
    const next = layer.length > 0 ? layer : JOBS.filter((job) => !placed.has(job));
    for (const job of next) {
      placed.add(job);
      order.push(job);
    }
  }
  return order.map((job) => ({
    job,
    inputs: recipeGoods(RECIPES[job].inputs),
    outputs: recipeGoods(RECIPES[job].outputs),
  }));
}
