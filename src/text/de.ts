// All player-facing German text lives here, so it can be translated later.

import type { Season } from "../sim/calendar";
import type { Speed } from "../ui/clockConstants";

// Keyed by Season so a missing season is a type error.
const seasons: Record<Season, string> = {
  spring: "Frühling",
  summer: "Sommer",
  autumn: "Herbst",
  winter: "Winter",
};

// Keyed by Speed so every selectable speed has a button text.
const speeds: Record<Speed, string> = {
  1: "1x",
  2: "2x",
  4: "4x",
};

export const de = {
  title: "Burg-RPG",
  tagline: "Eine mittelalterliche Burg, deren Berufe voneinander abhängen.",
  seasons,
  clock: {
    sectionLabel: "Spieluhr",
    dateLabel: "Datum",
    seasonLabel: "Jahreszeit",
    timeLabel: "Uhrzeit",
    day: "Tag",
    year: "Jahr",
    oClock: "Uhr",
    pause: "Pause",
    resume: "Weiter",
    speedGroupLabel: "Tempo",
    speeds,
  },
} as const;
