// Job assignment (docs/vision.md, section 7.3): the player sets a wish number
// per job and may pin single residents to a job; this module decides which
// workplace every resident has. It only ever changes Resident.workplaceId.
//
// Passes over state.residents, always in list order and never reordered:
// 1. Clear invalid workplaces (not adult, no such building, house, under
//    construction, or a pinned resident in a building of another job).
// 2. Pinned residents keep their building while it has room.
// 3. Non-pinned residents keep their building within the job's auto quota.
// 4. Pinned residents without a workplace get a free one of their job.
// 5. Free adults fill the remaining auto quotas in JOBS order.
// Keeping before placing makes the function idempotent: a second run finds
// every kept worker within quota and room, and nobody left to place.

import { getBuildingDefinition } from "./buildingConstants";
import { isFinished, type Building } from "./buildings";
import { JOBS, jobForBuilding, type Job } from "./jobs";
import { isAdult, type Resident } from "./residents";
import type { GameState } from "./state";

/** The job of the resident's workplace, or null without a valid workplace (none, unknown id or house). */
export function getJob(buildings: readonly Building[], resident: Resident): Job | null {
  if (resident.workplaceId === null) return null;
  const building = buildings.find((candidate) => candidate.id === resident.workplaceId);
  return building === undefined ? null : jobForBuilding(building.type);
}

interface Workplace {
  job: Job;
  /** Workplaces not yet taken in this run. */
  room: number;
}

function countByJob(): Record<Job, number> {
  return Object.fromEntries(JOBS.map((job) => [job, 0])) as Record<Job, number>;
}

/**
 * Applies the wish numbers and pins to the current buildings and residents.
 * Pure: returns a new state, and a resident whose workplaceId does not change
 * is the same object as in the input.
 */
export function assignJobs(state: GameState): GameState {
  // Finished work buildings in state.buildings order (Map keeps insertion order).
  const workplaces = new Map<number, Workplace>();
  const slots = countByJob();
  for (const building of state.buildings) {
    const job = jobForBuilding(building.type);
    if (job === null || !isFinished(building)) continue;
    const count = getBuildingDefinition(building.type).workplaces;
    workplaces.set(building.id, { job, room: count });
    slots[job] += count;
  }

  const adult = state.residents.map((resident) => isAdult(resident, state.elapsedHours));
  const pinned = countByJob();
  state.residents.forEach((resident, index) => {
    if (adult[index] && resident.pinnedJob !== null) pinned[resident.pinnedJob] += 1;
  });
  // Pinned residents count toward the wish number; automatic workers fill the rest.
  const autoQuota = countByJob();
  for (const job of JOBS) {
    autoQuota[job] = Math.max(0, Math.min(state.jobTargets[job], slots[job]) - Math.min(pinned[job], slots[job]));
  }

  // Pass 1: the workplace each resident may still hold, or null.
  const next: (number | null)[] = state.residents.map((resident, index) => {
    const id = resident.workplaceId;
    if (id === null || !adult[index]) return null;
    const workplace = workplaces.get(id);
    if (workplace === undefined) return null;
    if (resident.pinnedJob !== null && resident.pinnedJob !== workplace.job) return null;
    return id;
  });

  // Takes one place in the building if it has room; true on success.
  const take = (id: number): boolean => {
    const workplace = workplaces.get(id);
    if (workplace === undefined || workplace.room === 0) return false;
    workplace.room -= 1;
    return true;
  };
  // The first building of `job` in list order with room, taking one place there.
  const takeFree = (job: Job): number | null => {
    for (const [id, workplace] of workplaces) {
      if (workplace.job === job && take(id)) return id;
    }
    return null;
  };

  // Pass 2: pinned residents keep their building while it has room.
  state.residents.forEach((resident, index) => {
    const id = next[index];
    if (resident.pinnedJob === null || id === null || id === undefined) return;
    if (!take(id)) next[index] = null;
  });

  // Pass 3: non-pinned residents keep their building within the auto quota.
  const autoWorkers = countByJob();
  state.residents.forEach((resident, index) => {
    const id = next[index];
    if (resident.pinnedJob !== null || id === null || id === undefined) return;
    const job = workplaces.get(id)?.job;
    if (job !== undefined && autoWorkers[job] < autoQuota[job] && take(id)) {
      autoWorkers[job] += 1;
    } else {
      next[index] = null;
    }
  });

  // Pass 4: pinned residents without a workplace; beyond slots they wait idle.
  state.residents.forEach((resident, index) => {
    if (resident.pinnedJob === null || !adult[index] || next[index] !== null) return;
    next[index] = takeFree(resident.pinnedJob);
  });

  // Pass 5: free adults take the first job in JOBS order still below its quota.
  state.residents.forEach((resident, index) => {
    if (resident.pinnedJob !== null || !adult[index] || next[index] !== null) return;
    for (const job of JOBS) {
      if (autoWorkers[job] >= autoQuota[job]) continue;
      const id = takeFree(job);
      if (id === null) continue;
      autoWorkers[job] += 1;
      next[index] = id;
      return;
    }
  });

  let changed = false;
  const residents = state.residents.map((resident, index) => {
    const workplaceId = next[index] ?? null;
    if (workplaceId === resident.workplaceId) return resident;
    changed = true;
    return { ...resident, workplaceId };
  });
  return changed ? { ...state, residents } : state;
}
