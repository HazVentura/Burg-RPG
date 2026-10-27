// Need numbers for food, drink and housing (docs/vision.md, section 7.1):
// "Jedes Bedürfnis ist ein Wert von 0 bis 100.",
// "Brot, Wasser: werden täglich aus dem Lager verbraucht." and
// "Wohnraum: erfüllt, wenn die Person ein Bett hat."
// The ration size and the daily drop are balance choices, kept here so they
// can be tuned in one place.

/** Lowest value a need can have (inclusive). */
export const NEED_MIN = 0;

/** Highest value a need can have (inclusive); also the value after being fed. */
export const NEED_MAX = 100;

/** Bread one resident eats per game day, whatever their age. */
export const BREAD_PER_RESIDENT_PER_DAY = 1;

/** Water one resident drinks per game day, whatever their age. */
export const WATER_PER_RESIDENT_PER_DAY = 1;

/** Points a need loses on a day without its ration: 100 reaches 0 after seven days. */
export const NEED_DROP_PER_DAY_WITHOUT = 15;

/**
 * Points Wohnraum loses on a night without a bed. The same pace as food on
 * purpose: a homeless resident sinks as fast as a hungry one, 100 reaching 0
 * after seven nights, instead of the need jumping to 0 at once.
 */
export const HOUSING_DROP_PER_DAY_WITHOUT = 15;
