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
