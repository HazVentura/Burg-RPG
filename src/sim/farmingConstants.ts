// Balance numbers and season rules for farming (docs/vision.md, section 5:
// "Weizen, nur Ernte im Herbst, wächst Frühling/Sommer", and section 9:
// no wheat growth in winter). Only farmers follow the seasons; every other
// job works the same all year.

import type { Season } from "./calendar";

/** Seasons in which a farmer worker-hour grows RECIPES.farmer.outputs.wheat on the fields. */
export const GROWING_SEASONS: readonly Season[] = Object.freeze(["spring", "summer"] as const);

/** The season in which farmers move wheat from the fields into storage. */
export const HARVEST_SEASON: Season = "autumn";

/**
 * Wheat one farmer moves from the fields into storage per worker-hour in the
 * harvest season. A multiple of 1/8, so storage sums stay exact. With 2 farmers
 * (4 an hour), a year's growth of 480 wheat is in after 120 hours, half of autumn.
 */
export const HARVEST_PER_FARMER_HOUR = 2;
