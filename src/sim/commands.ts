// Player commands: pure functions GameState -> result. The UI sends these and
// never changes state itself. A command that can fail returns a discriminated
// union, so callers must check ok before they use the new state.

import { assignJobs } from "./assignment";
import { getBuildingDefinition } from "./buildingConstants";
import type { BuildingType } from "./buildings";
import { isJob, type Job } from "./jobs";
import { isAdult } from "./residents";
import type { GameState } from "./state";

export type OrderResult = { ok: true; state: GameState } | { ok: false; reason: "notEnoughGoods" };

/**
 * Orders a new building. The full cost is paid at once from storage; tick
 * finishes the building after its build time. Never mutates state.
 */
export function orderBuilding(state: GameState, type: BuildingType): OrderResult {
  const { cost, buildHours } = getBuildingDefinition(type);
  const { storage } = state;
  if (storage.wood < cost.wood || storage.stone < cost.stone) {
    return { ok: false, reason: "notEnoughGoods" };
  }
  return {
    ok: true,
    state: {
      ...state,
      storage: { ...storage, wood: storage.wood - cost.wood, stone: storage.stone - cost.stone },
      buildings: [...state.buildings, { id: state.nextBuildingId, type, hoursLeft: buildHours }],
      nextBuildingId: state.nextBuildingId + 1,
    },
  };
}

export type SetJobTargetResult =
  | { ok: true; state: GameState }
  | { ok: false; reason: "invalidCount" | "unknownJob" };

/**
 * Sets the wish number of `job` and redistributes at once, so the player sees
 * the effect without waiting for the next tick. A wish number above the free
 * workplaces is allowed; the job is then filled as far as possible.
 */
export function setJobTarget(state: GameState, job: Job, count: number): SetJobTargetResult {
  // The type says Job, but the UI hands over strings from the DOM; check at runtime.
  if (!isJob(job)) {
    return { ok: false, reason: "unknownJob" };
  }
  // Number.isInteger is false for NaN, Infinity and fractions.
  if (!Number.isInteger(count) || count < 0) {
    return { ok: false, reason: "invalidCount" };
  }
  return { ok: true, state: assignJobs({ ...state, jobTargets: { ...state.jobTargets, [job]: count } }) };
}

export type SetPinnedJobResult =
  | { ok: true; state: GameState }
  | { ok: false; reason: "unknownResident" | "notAdult" | "unknownJob" };

/**
 * Pins a resident to `job`, or releases the pin with null, and redistributes
 * at once. Releasing is allowed for anyone, so a pin can never get stuck.
 */
export function setPinnedJob(state: GameState, residentId: number, job: Job | null): SetPinnedJobResult {
  if (job !== null && !isJob(job)) {
    return { ok: false, reason: "unknownJob" };
  }
  const resident = state.residents.find((candidate) => candidate.id === residentId);
  if (resident === undefined) {
    return { ok: false, reason: "unknownResident" };
  }
  if (job !== null && !isAdult(resident, state.elapsedHours)) {
    return { ok: false, reason: "notAdult" };
  }
  const residents = state.residents.map((candidate) =>
    candidate.id === residentId ? { ...candidate, pinnedJob: job } : candidate,
  );
  return { ok: true, state: assignJobs({ ...state, residents }) };
}
