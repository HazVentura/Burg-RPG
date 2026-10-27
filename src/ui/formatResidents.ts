// Turns residents and wish numbers into the rows the Bewohner area shows.
// Pure and DOM-free so every text can be unit-tested; the view in app.ts only
// copies these values into elements it built once.

import { getJob } from "../sim/assignment";
import { getBuildingDefinition } from "../sim/buildingConstants";
import { isFinished } from "../sim/buildings";
import { JOBS, JOB_BUILDING, type Job } from "../sim/jobs";
import type { Needs } from "../sim/needs";
import { getAgeYears, isAdult } from "../sim/residents";
import type { GameState } from "../sim/state";
import { de } from "../text/de";
import { buildingDisplayNames } from "./buildingNames";

export type NeedKey = keyof Needs;

/** Fixed display order of the needs, so the bars never swap places. */
export const NEED_ORDER = ["bread", "water", "housing"] as const satisfies readonly NeedKey[];

export interface NeedRow {
  need: NeedKey;
  label: string;
  /** 0 to 100, for the bar. */
  value: number;
  /** The value rounded down, shown next to the bar. */
  valueText: string;
}

export interface ResidentRow {
  id: number;
  name: string;
  ageText: string;
  /** German name of the current job, or "Ohne Arbeit". */
  jobText: string;
  /** Name of the house the resident sleeps in ("Wohnhaus 2"), or "Obdachlos". */
  homeText: string;
  /** Set when a pin is in effect but the resident has no workplace of that job. */
  waitingNote: string | null;
  pinnedJob: Job | null;
  /** Only adults may be pinned to a job. */
  canPin: boolean;
  /** Visible label of the pin select, naming the resident. */
  pinLabel: string;
  needs: NeedRow[];
}

export interface JobTargetRow {
  job: Job;
  name: string;
  target: number;
  working: number;
  places: number;
  /** "<working> von <places> Plätzen besetzt". */
  occupancyText: string;
  /** False at 0, so the view never offers a negative wish number. */
  canDecrease: boolean;
}

export function formatAge(years: number): string {
  return `${years} ${years === 1 ? de.residentList.yearSingular : de.residentList.yearPlural}`;
}

/** One row per resident, in state.residents order. */
export function formatResidentList(state: GameState): ResidentRow[] {
  const buildingNames = buildingDisplayNames(state.buildings);
  return state.residents.map((resident) => {
    const homeName = resident.homeId === null ? undefined : buildingNames.get(resident.homeId);
    const job = getJob(state.buildings, resident);
    const waiting = resident.pinnedJob !== null && job !== resident.pinnedJob;
    return {
      id: resident.id,
      name: resident.name,
      ageText: formatAge(getAgeYears(resident, state.elapsedHours)),
      jobText: job === null ? de.residentList.noJob : de.jobs[job],
      homeText: homeName ?? de.residentList.homeless,
      waitingNote: waiting ? de.residentList.waitingForWorkplace : null,
      pinnedJob: resident.pinnedJob,
      canPin: isAdult(resident, state.elapsedHours),
      pinLabel: `${de.residentList.pinLabelPrefix} ${resident.name}`,
      needs: NEED_ORDER.map((need) => {
        const value = resident.needs[need];
        return { need, label: de.needs[need], value, valueText: String(Math.floor(value)) };
      }),
    };
  });
}

export function formatOccupancy(working: number, places: number): string {
  const { of, placeSingular, placePlural, occupied } = de.jobTargets;
  return `${working} ${of} ${places} ${places === 1 ? placeSingular : placePlural} ${occupied}`;
}

/** One row per job, in JOBS order. */
export function formatJobTargets(state: GameState): JobTargetRow[] {
  return JOBS.map((job) => {
    const working = state.residents.filter((resident) => getJob(state.buildings, resident) === job).length;
    const places = state.buildings
      .filter((building) => building.type === JOB_BUILDING[job] && isFinished(building))
      .reduce((sum, building) => sum + getBuildingDefinition(building.type).workplaces, 0);
    const target = state.jobTargets[job];
    return {
      job,
      name: de.jobs[job],
      target,
      working,
      places,
      occupancyText: formatOccupancy(working, places),
      canDecrease: target > 0,
    };
  });
}
