// All player-facing German text lives here, so it can be translated later.

import type { Season } from "../sim/calendar";
import type { BuildingType } from "../sim/buildings";
import type { ChronicleKind } from "../sim/chronicle";
import type { OrderResult, SetJobTargetResult, SetPinnedJobResult } from "../sim/commands";
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

// Keyed by BuildingType so a missing building is a type error (docs/vision.md, sections 5 and 6).
const buildingTypes: Record<BuildingType, string> = {
  house: "Wohnhaus",
  well: "Brunnen",
  field: "Feld",
  mill: "Mühle",
  bakery: "Bäckerei",
  woodcutterHut: "Holzfällerhütte",
};

// The cause after a bottleneck good: "Engpass: Brot (keine Bäckerei)". One text per
// building type with its own article, so a new type without a text is a type error.
const missingBuilding: Record<BuildingType, string> = {
  house: "kein Wohnhaus",
  well: "kein Brunnen",
  field: "kein Feld",
  mill: "keine Mühle",
  bakery: "keine Bäckerei",
  woodcutterHut: "keine Holzfällerhütte",
};

// One text per reason orderBuilding can fail; keyed so a new reason is a type error.
export type OrderFailure = Extract<OrderResult, { ok: false }>["reason"];
const orderErrors: Record<OrderFailure, string> = {
  notEnoughGoods: "Dafür reichen Holz und Stein im Lager nicht.",
  unknownBuilding: "Dieses Gebäude gibt es nicht.",
};

// Message text per chronicle entry kind; keyed so a new kind without a text is a type error.
// The display name ("Mühle 1") or good name ("Mehl") comes first, the suffix follows.
const chronicleMessages: Record<ChronicleKind, string> = {
  buildingFinished: "fertig gebaut",
  goodRanOut: "ist ausgegangen",
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
  productionChain: {
    // The soft hyphen (U+00AD) lets the heading break as "Produktions-" / "kette"
    // at 200 % zoom on a phone instead of mid-word without a hyphen.
    heading: "Produktions\u00ADkette",
    listLabel: "Schritte der Produktionskette",
    // "Engpass: Wasser, Holz"; the goods follow in storage order, each with its
    // cause in parentheses when its building is missing: "Engpass: Brot (keine Bäckerei)".
    bottleneckPrefix: "Engpass",
    missingBuilding,
    noBottleneck: "Kein Engpass",
    // After a good that is missing: "Weizen 0 fehlt".
    missing: "fehlt",
    // Read by screen readers after "fehlt" on a bottleneck good: "Weizen 0 fehlt, Engpass".
    bottleneckMark: "Engpass",
    // "2 bei der Arbeit"; the same wording for one and for several.
    working: "bei der Arbeit",
    // The last step: "Brot 60, Wasser 40 → Bewohner (essen und trinken)".
    residents: "Bewohner",
    residentsAction: "essen und trinken",
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
  // Kept apart from `buildings` so the area texts of job 009 stay as they are.
  buildingPanel: {
    listLabel: "Gebäudeliste",
    // "<n> Tag(e) <m> Stunde(n)"; parts that are 0 are left out.
    daySingular: "Tag",
    dayPlural: "Tage",
    hourSingular: "Stunde",
    hourPlural: "Stunden",
    // "noch 12 Stunden" under a building in construction.
    remainingPrefix: "noch",
    progressLabelSuffix: "Baufortschritt",
    workplaceSingular: "Arbeitsplatz",
    workplacePlural: "Arbeitsplätze",
    bedSingular: "Bett",
    bedPlural: "Betten",
    // "Es fehlen 5 Holz, 2 Stein".
    missingPrefix: "Es fehlen",
    buildHeading: "Bauen",
    costLabel: "Kosten",
    buildTimeLabel: "Bauzeit",
    offersLabel: "Bietet",
    // Button text after the building name: "Brunnen bauen".
    buildButtonSuffix: "bauen",
    orderErrors,
  },
  buildingTypes,
  chronicle: {
    heading: "Chronik",
    listLabel: "Ereignisse, neueste zuerst",
    empty: "Noch keine Ereignisse.",
    messages: chronicleMessages,
  },
} as const;
