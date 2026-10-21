// Turns the derived calendar into the three strings the clock section shows.
// Pure and DOM-free so the wording can be unit-tested.

import type { Calendar } from "../sim/calendar";
import { de } from "../text/de";

export interface ClockText {
  date: string;
  season: string;
  time: string;
}

export function formatClock(calendar: Calendar): ClockText {
  return {
    date: `${de.clock.day} ${calendar.day}, ${de.clock.year} ${calendar.year}`,
    season: de.seasons[calendar.season],
    // The game only has whole hours, so minutes are always ":00".
    time: `${String(calendar.hour).padStart(2, "0")}:00 ${de.clock.oClock}`,
  };
}
