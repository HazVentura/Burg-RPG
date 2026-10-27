// Turns the chronicle entries of the state into the rows the Chronik area
// shows. Pure and DOM-free so the wording and keys can be unit-tested.

import { getCalendarAt } from "../sim/calendar";
import type { ChronicleEntry } from "../sim/chronicle";
import type { GameState } from "../sim/state";
import { de } from "../text/de";
import { buildingDisplayNames } from "./buildingNames";
import { formatClock } from "./formatClock";

export interface ChronicleRow {
  /**
   * Stable and unique within the chronicle: the entry's running number since
   * the start of the game, so it stays the same when the cap drops old entries.
   */
  key: string;
  /** "Mühle 1 fertig gebaut", "Mehl ist ausgegangen". */
  text: string;
  /** "Tag 3, Jahr 1, Frühling, 14:00 Uhr". */
  timeText: string;
}

/** Date, season and time of a game hour in one line. */
export function formatChronicleTime(hour: number): string {
  const { date, season, time } = formatClock(getCalendarAt(hour));
  return `${date}, ${season}, ${time}`;
}

function formatMessage(entry: ChronicleEntry, names: ReadonlyMap<number, string>): string {
  const suffix = de.chronicle.messages[entry.kind];
  switch (entry.kind) {
    case "buildingFinished":
      return `${names.get(entry.buildingId) ?? de.buildingTypes[entry.buildingType]} ${suffix}`;
    case "goodRanOut":
      return `${de.goods[entry.good]} ${suffix}`;
  }
}

/** One row per entry, in chronicle order (newest first). */
export function formatChronicle(state: GameState): ChronicleRow[] {
  const names = buildingDisplayNames(state.buildings);
  // The newest entry has running number nextChronicleId - 1, the next one down has one less.
  return state.chronicle.map((entry, index) => ({
    key: String(state.nextChronicleId - 1 - index),
    text: formatMessage(entry, names),
    timeText: formatChronicleTime(entry.hour),
  }));
}
