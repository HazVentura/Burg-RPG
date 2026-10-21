// The complete game state and the tick that advances it.
// GameState is plain JSON-compatible data so that later save games can store
// it with JSON.stringify and restore it unchanged.

import { START_HOUSES } from "./buildingConstants";
import { assignJobs } from "./assignment";
import { advanceConstruction, type Building } from "./buildings";
import type { Storage } from "./goods";
import { JOBS, type Job } from "./jobs";
import { consumeDailyFood } from "./needs";
import { produceHour } from "./production";
import { createRandom } from "./random";
import { createSettlers, type Resident } from "./residents";
import { INITIAL_STORAGE } from "./storageConstants";
import { HOURS_PER_DAY } from "./timeConstants";

export interface GameState {
  /** Game hours since the start of the game; one tick adds one hour. */
  elapsedHours: number;
  /** Random generator state; continue with createRandom(state.rngState). */
  rngState: number;
  /** Central castle storage: the stock of every good. */
  storage: Storage;
  /** All residents in creation order. */
  residents: Resident[];
  /** id for the next new resident; only ever grows, so ids are never reused. */
  nextResidentId: number;
  /** All buildings, finished or under construction, in creation order. */
  buildings: Building[];
  /** id for the next new building; only ever grows, so ids are never reused. */
  nextBuildingId: number;
  /** Wish number per job (Wunschzahl): how many residents the player wants in it, pinned ones included. */
  jobTargets: Record<Job, number>;
}

/** Every job's wish number at 0, built from JOBS so no job is forgotten; a fresh object per call. */
function createJobTargets(): Record<Job, number> {
  return Object.fromEntries(JOBS.map((job) => [job, 0])) as Record<Job, number>;
}

/** The free starting houses with ids 1..START_HOUSES; fresh objects on every call. */
function createStartHouses(): Building[] {
  return Array.from({ length: START_HOUSES }, (_, index): Building => ({ id: index + 1, type: "house", hoursLeft: 0 }));
}

export function createInitialState(seed: number): GameState {
  // One generator for all settler draws; its final state continues the sequence.
  const random = createRandom(seed);
  const { residents, nextResidentId } = createSettlers(random);
  return {
    elapsedHours: 0,
    rngState: random.seed,
    // A copy, so changes in one game never leak into the constant or another game.
    storage: { ...INITIAL_STORAGE },
    residents,
    nextResidentId,
    buildings: createStartHouses(),
    nextBuildingId: START_HOUSES + 1,
    jobTargets: createJobTargets(),
  };
}

/**
 * Advances the game by one hour. Returns a new state, never mutates the input.
 * Unchanged nested objects such as residents are shared with the input, not copied;
 * storage is a fresh copy every tick, since production writes to it.
 * Order per tick:
 * 1. Production on the buildings as they are at the start of the tick, so a
 *    building finished in this tick works from the next one (produceHour).
 * 2. All buildings under construction get 1 hour closer to done.
 * 3. On the step into hour 0 of a new day, residents eat and drink
 *    (consumeDailyFood), including what was made in this last hour.
 * 4. Job assignment (assignJobs) at the new hour, so a building finished in
 *    this tick is staffed now and produces from the next tick.
 */
export function tick(state: GameState): GameState {
  const advanced: GameState = {
    ...state,
    elapsedHours: state.elapsedHours + 1,
    storage: produceHour(state.buildings, state.residents, state.storage),
    buildings: advanceConstruction(state.buildings),
  };
  if (advanced.elapsedHours % HOURS_PER_DAY !== 0) {
    return assignJobs(advanced);
  }
  const { residents, storage } = consumeDailyFood(advanced.residents, advanced.storage);
  return assignJobs({ ...advanced, residents, storage });
}
