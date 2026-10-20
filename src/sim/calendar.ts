// The calendar is derived from elapsed game hours instead of being stored.
// That way the state can never hold impossible dates such as day 11 or hour 24,
// and there is only one number to advance and to save.

import type { GameState } from "./state";
import {
  DAYS_PER_SEASON,
  FIRST_DAY_OF_SEASON,
  FIRST_YEAR,
  HOURS_PER_DAY,
  SEASONS,
  SEASONS_PER_YEAR,
} from "./timeConstants";

export type Season = (typeof SEASONS)[number];

export interface Calendar {
  /** Starts at 1, no upper limit. */
  year: number;
  season: Season;
  /** Day within the current season, 1 to DAYS_PER_SEASON. */
  day: number;
  /** Hour of the day, 0 to HOURS_PER_DAY - 1. */
  hour: number;
}

export function getCalendar(state: GameState): Calendar {
  const hours = state.elapsedHours;
  const totalDays = Math.floor(hours / HOURS_PER_DAY);
  const totalSeasons = Math.floor(totalDays / DAYS_PER_SEASON);

  return {
    year: Math.floor(totalSeasons / SEASONS_PER_YEAR) + FIRST_YEAR,
    season: seasonAt(totalSeasons % SEASONS_PER_YEAR),
    day: (totalDays % DAYS_PER_SEASON) + FIRST_DAY_OF_SEASON,
    hour: hours % HOURS_PER_DAY,
  };
}

function seasonAt(index: number): Season {
  const season = SEASONS[index];
  // Unreachable for a valid state: the index comes from a modulo by SEASONS.length.
  // It fails loudly instead of returning a wrong season if elapsedHours is ever
  // negative or not an integer.
  if (season === undefined) {
    throw new RangeError(`No season at index ${index}`);
  }
  return season;
}
