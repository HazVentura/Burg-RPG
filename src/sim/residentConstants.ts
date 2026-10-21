// Resident numbers from docs/vision.md.
// Section 10 "Startzustand": "4 Paare (8 Erwachsene)".
// Section 7.2: "Erwachsen | ab 5" game years; old age starts around 25, so the
// starting settlers are young adults well below that.

/** Number of couples a new game starts with. */
export const START_COUPLES = 4;

/** Youngest starting settler in whole game years: the adult age from section 7.2. */
export const START_AGE_MIN_YEARS = 5;

/** Oldest starting settler in whole game years, inclusive. */
export const START_AGE_MAX_YEARS = 10;
