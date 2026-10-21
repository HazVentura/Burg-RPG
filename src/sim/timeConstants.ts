// Calendar numbers from docs/vision.md, section 4 "Zeit".
// Kept in one place so the calendar, and every later rule that depends on
// days or seasons, derives from the same values instead of inline numbers.

/** One tick is one game hour. */
export const HOURS_PER_DAY = 24;

/** Each season lasts this many days. */
export const DAYS_PER_SEASON = 10;

/** Season order within a year. Later jobs index into this array. */
export const SEASONS = ["spring", "summer", "autumn", "winter"] as const;

export const SEASONS_PER_YEAR = SEASONS.length;

/** The calendar's first year; years count up from here without limit. */
export const FIRST_YEAR = 1;

/** The first day of a season; days are 1-based like in the vision. */
export const FIRST_DAY_OF_SEASON = 1;

/** Days in one game year (40). Derived, so it follows any change to the season length. */
export const DAYS_PER_YEAR = DAYS_PER_SEASON * SEASONS_PER_YEAR;

/** Game hours, and so ticks, in one game year (960). Resident ages are counted in these years. */
export const HOURS_PER_YEAR = HOURS_PER_DAY * DAYS_PER_YEAR;
