// Resident numbers from docs/vision.md.
// Section 10 "Startzustand": "4 Paare (8 Erwachsene)".
// Section 7.2: "Erwachsen | ab 5" game years; old age starts around 25, so the
// starting settlers are young adults well below that.

/** Number of couples a new game starts with. */
export const START_COUPLES = 4;

/** Section 7.2: "Erwachsen | ab 5" game years. Only adults work or can be pinned to a job. */
export const ADULT_AGE_YEARS = 5;

/** Youngest starting settler in whole game years: settlers all start as adults. */
export const START_AGE_MIN_YEARS = ADULT_AGE_YEARS;

/** Oldest starting settler in whole game years, inclusive. */
export const START_AGE_MAX_YEARS = 10;
