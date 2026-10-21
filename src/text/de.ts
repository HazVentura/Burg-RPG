// All player-facing German text lives here, so it can be translated later.

import type { Season } from "../sim/calendar";
import type { SetJobTargetResult, SetPinnedJobResult } from "../sim/commands";
import type { Good } from "../sim/goods";
import type { Job } from "../sim/jobs";
import type { Needs } from "../sim/needs";
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

// Keyed by Good so a missing good is a type error.
const goods: Record<Good, string> = {
  wheat: "Weizen",
  flour: "Mehl",
  bread: "Brot",
  water: "Wasser",
  wood: "Holz",
  stone: "Stein",
  ironOre: "Eisenerz",
  tools: "Werkzeug",
};

// Keyed by Job so a missing job is a type error (docs/vision.md, section 5).
const jobs: Record<Job, string> = {
  waterCarrier: "Wasserträger",
  farmer: "Bauer",
  miller: "Müller",
  baker: "Bäcker",
  woodcutter: "Holzfäller",
};

// Keyed by need so a new need cannot go without a label.
const needs: Record<keyof Needs, string> = {
  bread: "Brot",
  water: "Wasser",
};

// One text per reason a job command can fail; keyed so a new reason is a type error.
export type CommandFailure = Extract<SetJobTargetResult | SetPinnedJobResult, { ok: false }>["reason"];
const commandErrors: Record<CommandFailure, string> = {
  invalidCount: "Diese Wunschzahl ist nicht möglich.",
  unknownResident: "Diesen Bewohner gibt es nicht mehr.",
  notAdult: "Nur Erwachsene können einen festen Beruf bekommen.",
  unknownJob: "Diesen Beruf gibt es nicht.",
};

export const de = {
  title: "Burg-RPG",
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
  goods,
  storage: {
    heading: "Lager",
  },
  residents: {
    heading: "Bewohner",
    countLabel: "Anzahl",
  },
  jobs,
  needs,
  // Kept apart from `residents` so the area texts of job 009 stay as they are.
  residentList: {
    listLabel: "Bewohnerliste",
    ageLabel: "Alter",
    yearSingular: "Jahr",
    yearPlural: "Jahre",
    jobLabel: "Beruf",
    noJob: "Ohne Arbeit",
    waitingForWorkplace: "Wartet auf Arbeitsplatz",
    needsLabel: "Bedürfnisse",
    // Visible label of the pin select; the resident's name follows.
    pinLabelPrefix: "Zuteilung für",
    automatic: "Automatisch",
    commandErrors,
  },
  jobTargets: {
    heading: "Wunschzahlen",
    targetLabel: "Wunsch",
    // "<working> von <places> Plätzen besetzt"; singular for exactly one place.
    of: "von",
    placeSingular: "Platz",
    placePlural: "Plätzen",
    occupied: "besetzt",
    decrease: "Wunschzahl verringern",
    increase: "Wunschzahl erhöhen",
    decreaseSymbol: "−",
    increaseSymbol: "+",
  },
  buildings: {
    heading: "Gebäude",
    finishedLabel: "Fertig",
    underConstructionLabel: "Im Bau",
  },
} as const;
