// Balance numbers for jobs.

import type { Job } from "./jobs";

/**
 * The wish numbers (Wunschzahlen) of a new game, so every work building the
 * player orders is staffed as soon as it is finished (docs/vision.md, 7.3).
 * They add up to 8, the starting adults, so no job is left without people.
 * Worked out from RECIPES, with every worker at 0.5 output per hour (12 a day):
 * - 2 water carriers make 24 water a day: 8 for drinking, 6 for the baker.
 * - 1 baker makes 12 bread a day, which covers the 8 eaten.
 * - 1 miller makes the 12 flour a day; the baker needs 6 of it.
 * - 2 farmers make 24 wheat a day, which covers the miller's 12.
 * - 2 woodcutters make 24 wood a day: 3 for the baker, the rest for building.
 */
export const START_JOB_TARGETS: Readonly<Record<Job, number>> = Object.freeze({
  waterCarrier: 2,
  farmer: 2,
  miller: 1,
  baker: 1,
  woodcutter: 2,
});
