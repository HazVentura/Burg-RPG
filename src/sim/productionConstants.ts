// Balance numbers for production. The vision names inputs and outputs per job
// (docs/vision.md, section 5) but gives no amounts. With these values one water
// carrier makes 12 water a day, and one baker turns 6 flour, 6 water and 3 wood
// into 12 bread a day, so one baker can feed the 8 starting settlers.
//
// Every amount is a multiple of 1/8, which binary floating point holds exactly,
// so storage sums never drift however long a game runs.

import type { Good } from "./goods";
import type { Job } from "./jobs";

/** Goods amounts per worker per game hour. A good missing from a map is not part of the recipe. */
export interface Recipe {
  inputs: Readonly<Partial<Record<Good, number>>>;
  outputs: Readonly<Partial<Record<Good, number>>>;
}

function define(recipe: Recipe): Readonly<Recipe> {
  // Freeze the nested maps too, so no game can change the template for the next one.
  return Object.freeze({ inputs: Object.freeze({ ...recipe.inputs }), outputs: Object.freeze({ ...recipe.outputs }) });
}

export const RECIPES: Readonly<Record<Job, Readonly<Recipe>>> = Object.freeze({
  waterCarrier: define({ inputs: {}, outputs: { water: 0.5 } }),
  // The 0.5 wheat grows on the fields (GameState.fieldWheat) in spring and summer;
  // it does not go into storage. Farmers harvest it into storage in autumn and rest
  // in winter (see farmingConstants.ts and farmerHour in production.ts). The recipe
  // stays here so the production chain still names the farmer as the maker of wheat.
  farmer: define({ inputs: {}, outputs: { wheat: 0.5 } }),
  miller: define({ inputs: { wheat: 0.5 }, outputs: { flour: 0.5 } }),
  // The wood heats the oven.
  baker: define({ inputs: { flour: 0.25, water: 0.25, wood: 0.125 }, outputs: { bread: 0.5 } }),
  woodcutter: define({ inputs: {}, outputs: { wood: 0.5 } }),
});
