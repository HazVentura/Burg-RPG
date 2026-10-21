// The starting jobs (docs/vision.md, section 5) and the work building of each.
// A resident's job is not stored: it follows from the building they work in
// (Resident.workplaceId), so a job and its workplace can never disagree.

import type { BuildingType } from "./buildings";

/** Every job that exists yet. Miner and smith come later with castle level 2. */
export const JOBS = ["waterCarrier", "farmer", "miller", "baker", "woodcutter"] as const;

export type Job = (typeof JOBS)[number];

/** docs/vision.md, section 5: each job works in exactly one building type. */
export const JOB_BUILDING: Readonly<Record<Job, BuildingType>> = Object.freeze({
  waterCarrier: "well",
  farmer: "field",
  miller: "mill",
  baker: "bakery",
  woodcutter: "woodcutterHut",
});

/** The job done in a building of `type`, or null for a building without workplaces (house). */
export function jobForBuilding(type: BuildingType): Job | null {
  return JOBS.find((job) => JOB_BUILDING[job] === type) ?? null;
}
