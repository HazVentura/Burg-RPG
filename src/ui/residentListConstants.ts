// Display thresholds of the need bars. Not game balance: they only decide
// when a <meter> switches its look, so a low need stands out at a glance.

import { NEED_MAX, NEED_MIN } from "../sim/needConstants";

export const NEED_BAR_MIN = NEED_MIN;
export const NEED_BAR_MAX = NEED_MAX;

/** Below this the bar shows its "bad" look (around 0). */
export const NEED_BAR_LOW = 34;

/** From this up the bar shows its "good" look (around 100); between low and high it looks "fair" (around 50). */
export const NEED_BAR_HIGH = 67;
