// Turns building definitions and the building list into the rows the Gebäude
// area shows. Pure and DOM-free so every text can be unit-tested; the view in
// app.ts only copies these values into elements it built once.

import { getBuildingDefinition } from "../sim/buildingConstants";
import { BUILDING_TYPES, isFinished, type Building, type BuildingType } from "../sim/buildings";
import { jobForBuilding } from "../sim/jobs";
import type { GameState } from "../sim/state";
import { HOURS_PER_DAY } from "../sim/timeConstants";
import { de } from "../text/de";
import { formatOccupancy } from "./formatResidents";

export interface BuildOptionRow {
  type: BuildingType;
  name: string;
  /** "15 Holz, 8 Stein"; a cost part of 0 is left out. */
  costText: string;
  /** "1 Tag", "3 Tage". */
  buildTimeText: string;
  /** "2 Arbeitsplätze (Wasserträger)" or "4 Betten". */
  offersText: string;
  affordable: boolean;
  /** "Es fehlen 5 Holz" when not affordable, otherwise null. */
  missingText: string | null;
}

/** Fields only set while a building is under construction. */
export interface ConstructionInfo {
  /** Whole percent, rounded down, so an unfinished building never shows 100. */
  percent: number;
  /** "noch 12 Stunden". */
  remainingText: string;
}

/** Fields only set for a finished work building. */
export interface OccupancyInfo {
  working: number;
  places: number;
  /** "<working> von <places> Plätzen besetzt". */
  text: string;
}

export interface BuildingRow {
  id: number;
  type: BuildingType;
  /** "Wohnhaus 1", "Brunnen 2": type name plus running number within the type. */
  name: string;
  finished: boolean;
  /** Set while under construction, otherwise null. */
  construction: ConstructionInfo | null;
  /** Set for a finished work building, otherwise null. Never set before it is finished. */
  occupancy: OccupancyInfo | null;
  /**
   * What the building offers when no occupancy is shown: "4 Betten" for a
   * house, "2 Arbeitsplätze (Wasserträger)" for a work building under
   * construction. Null for a finished work building, which shows its occupancy.
   */
  offersText: string | null;
}

function plural(count: number, singular: string, pluralForm: string): string {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

/** Whole game hours as days and hours, leaving out parts that are 0. */
export function formatDuration(hours: number): string {
  const { daySingular, dayPlural, hourSingular, hourPlural } = de.buildingPanel;
  const days = Math.floor(hours / HOURS_PER_DAY);
  const rest = hours % HOURS_PER_DAY;
  const parts: string[] = [];
  if (days > 0) parts.push(plural(days, daySingular, dayPlural));
  // 0 hours alone still needs a text, so a zero duration is never empty.
  if (rest > 0 || days === 0) parts.push(plural(rest, hourSingular, hourPlural));
  return parts.join(" ");
}

/** "15 Holz, 8 Stein"; parts that are 0 are left out. */
function formatGoods(wood: number, stone: number): string {
  const parts: string[] = [];
  if (wood > 0) parts.push(`${wood} ${de.goods.wood}`);
  if (stone > 0) parts.push(`${stone} ${de.goods.stone}`);
  return parts.join(", ");
}

/** What a building of `type` offers: workplaces with their job, or beds. */
function formatOffers(type: BuildingType): string {
  const { workplaces, beds } = getBuildingDefinition(type);
  const job = jobForBuilding(type);
  if (job === null) {
    return plural(beds, de.buildingPanel.bedSingular, de.buildingPanel.bedPlural);
  }
  return `${plural(workplaces, de.buildingPanel.workplaceSingular, de.buildingPanel.workplacePlural)} (${de.jobs[job]})`;
}

/** One row per building type, in BUILDING_TYPES order. */
export function formatBuildOptions(state: GameState): BuildOptionRow[] {
  const { wood, stone } = state.storage;
  return BUILDING_TYPES.map((type) => {
    const { cost, buildHours } = getBuildingDefinition(type);
    const missingWood = Math.max(0, cost.wood - wood);
    const missingStone = Math.max(0, cost.stone - stone);
    const affordable = missingWood === 0 && missingStone === 0;
    return {
      type,
      name: de.buildingTypes[type],
      costText: formatGoods(cost.wood, cost.stone),
      buildTimeText: formatDuration(buildHours),
      offersText: formatOffers(type),
      affordable,
      missingText: affordable ? null : `${de.buildingPanel.missingPrefix} ${formatGoods(missingWood, missingStone)}`,
    };
  });
}

/**
 * Display name per building id: type name plus a running number within the
 * type, in list order ("Wohnhaus 1", "Brunnen 2"). Shared by the building list
 * and the chronicle, so both always name a building the same way. Buildings are
 * never removed, so the running number of a building never changes.
 */
export function buildingDisplayNames(buildings: readonly Building[]): Map<number, string> {
  const countByType = new Map<BuildingType, number>();
  const names = new Map<number, string>();
  for (const building of buildings) {
    const number = (countByType.get(building.type) ?? 0) + 1;
    countByType.set(building.type, number);
    names.set(building.id, `${de.buildingTypes[building.type]} ${number}`);
  }
  return names;
}

/** One row per building, in state.buildings order. */
export function formatBuildingList(state: GameState): BuildingRow[] {
  const names = buildingDisplayNames(state.buildings);
  return state.buildings.map((building) => {
    const { buildHours, workplaces } = getBuildingDefinition(building.type);
    const finished = isFinished(building);
    const isWorkBuilding = jobForBuilding(building.type) !== null;

    let construction: ConstructionInfo | null = null;
    if (!finished) {
      construction = {
        percent: Math.floor(((buildHours - building.hoursLeft) / buildHours) * 100),
        remainingText: `${de.buildingPanel.remainingPrefix} ${formatDuration(building.hoursLeft)}`,
      };
    }

    // assignJobs only staffs finished buildings, so occupancy is shown only then.
    let occupancy: OccupancyInfo | null = null;
    if (finished && isWorkBuilding) {
      const working = state.residents.filter((resident) => resident.workplaceId === building.id).length;
      occupancy = { working, places: workplaces, text: formatOccupancy(working, workplaces) };
    }

    return {
      id: building.id,
      type: building.type,
      name: names.get(building.id) ?? de.buildingTypes[building.type],
      finished,
      construction,
      occupancy,
      offersText: occupancy === null ? formatOffers(building.type) : null,
    };
  });
}
