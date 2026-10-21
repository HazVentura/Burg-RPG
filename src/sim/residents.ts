// Residents are individuals (docs/vision.md, section 7). This module settles
// their shape, how age is derived and how the starting settlers are created.
//
// Age is not stored: a resident keeps the hour of birth, and age follows from
// the clock. So tick never has to touch residents for them to age, and a
// newborn later only needs bornAtHour = state.elapsedHours.

import { pickName } from "./names";
import type { Random } from "./random";
import { START_AGE_MAX_YEARS, START_AGE_MIN_YEARS, START_COUPLES } from "./residentConstants";
import { DAYS_PER_YEAR, HOURS_PER_DAY, HOURS_PER_YEAR } from "./timeConstants";

export const SEXES = ["female", "male"] as const;

export type Sex = (typeof SEXES)[number];

export interface Resident {
  /** Positive integer, unique within the game and never reused (see GameState.nextResidentId). */
  id: number;
  /** Given name. */
  name: string;
  sex: Sex;
  /** elapsedHours value at birth; negative for settlers born before the game began. */
  bornAtHour: number;
  /** id of the partner, or null without a partner. */
  partnerId: number | null;
}

/** Completed game years of `resident` at the given elapsed hours. */
export function getAgeYears(resident: Resident, elapsedHours: number): number {
  return Math.floor((elapsedHours - resident.bornAtHour) / HOURS_PER_YEAR);
}

export interface Settlers {
  residents: Resident[];
  nextResidentId: number;
}

/**
 * Creates the starting couples, female first in each couple, with ids from 1.
 * Draw order per resident is fixed: name, age, birthday offset. Changing it
 * changes every seeded game, so keep it stable.
 */
export function createSettlers(random: Random): Settlers {
  const residents: Resident[] = [];
  let nextResidentId = 1;

  for (let couple = 0; couple < START_COUPLES; couple++) {
    const femaleId = nextResidentId++;
    const maleId = nextResidentId++;
    residents.push(createSettler(random, femaleId, "female", maleId, residents));
    residents.push(createSettler(random, maleId, "male", femaleId, residents));
  }

  return { residents, nextResidentId };
}

function createSettler(
  random: Random,
  id: number,
  sex: Sex,
  partnerId: number,
  existing: readonly Resident[],
): Resident {
  const name = pickName(
    random,
    sex,
    existing.map((resident) => resident.name),
  );
  const ageYears = randomIntInclusive(random, START_AGE_MIN_YEARS, START_AGE_MAX_YEARS);
  // Spreads birthdays over the year, so settlers do not all age on the same day.
  const birthDayOffset = randomIntInclusive(random, 0, DAYS_PER_YEAR - 1);
  return {
    id,
    name,
    sex,
    bornAtHour: -(ageYears * HOURS_PER_YEAR + birthDayOffset * HOURS_PER_DAY),
    partnerId,
  };
}

function randomIntInclusive(random: Random, min: number, max: number): number {
  return min + Math.floor(random.next() * (max - min + 1));
}
