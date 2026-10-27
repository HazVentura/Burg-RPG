// The complete game state and the tick that advances it.
// GameState is plain JSON-compatible data so that later save games can store
// it with JSON.stringify and restore it unchanged.

import { START_HOUSES } from "./buildingConstants";
import { assignJobs } from "./assignment";
import { advanceConstruction, type Building } from "./buildings";
import { getCalendarAt } from "./calendar";
import { detectEvents, prependEntries, type ChronicleEntry } from "./chronicle";
import type { Storage } from "./goods";
import { START_JOB_TARGETS } from "./jobConstants";
import type { Job } from "./jobs";
import { assignHomes } from "./housing";
import { consumeDailyFood, updateHousingNeed } from "./needs";
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
  /**
   * Wheat growing on all fields together, not yet in storage. Farmers grow it
   * in spring and summer and harvest it into storage in autumn; it is lost in winter.
   */
  fieldWheat: number;
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
  /** Notable events, newest first, at most CHRONICLE_MAX_ENTRIES (see chronicle.ts). */
  chronicle: ChronicleEntry[];
  /**
   * Number of chronicle entries ever recorded; only ever grows. The UI derives a
   * stable key per entry from it, which survives the cap dropping old entries.
   */
  nextChronicleId: number;
}

/** The start wish numbers; a fresh copy per call, so no game can change the constant or another game. */
function createJobTargets(): Record<Job, number> {
  return { ...START_JOB_TARGETS };
}

/** The free starting houses with ids 1..START_HOUSES; fresh objects on every call. */
function createStartHouses(): Building[] {
  return Array.from({ length: START_HOUSES }, (_, index): Building => ({ id: index + 1, type: "house", hoursLeft: 0 }));
}

export function createInitialState(seed: number): GameState {
  // One generator for all settler draws; its final state continues the sequence.
  const random = createRandom(seed);
  const { residents, nextResidentId } = createSettlers(random);
  // Same bed assignment as every tick: residents 1-4 in house 1, 5-8 in house 2.
  return assignHomes({
    elapsedHours: 0,
    rngState: random.seed,
    // A copy, so changes in one game never leak into the constant or another game.
    storage: { ...INITIAL_STORAGE },
    fieldWheat: 0,
    residents,
    nextResidentId,
    buildings: createStartHouses(),
    nextBuildingId: START_HOUSES + 1,
    jobTargets: createJobTargets(),
    chronicle: [],
    nextChronicleId: 0,
  });
}

/**
 * Advances the game by one hour. Returns a new state, never mutates the input.
 * Unchanged nested objects such as residents are shared with the input, not copied;
 * storage is a fresh copy every tick, since production writes to it.
 * Order per tick:
 * 1. Production on the buildings as they are at the start of the tick, so a
 *    building finished in this tick works from the next one (produceHour).
 *    The season is the one of the hour the tick starts in: the tick from hour
 *    479 to 480 is still summer. Farmers grow, harvest or rest by it, which
 *    changes fieldWheat; all other jobs ignore the season.
 * 2. All buildings under construction get 1 hour closer to done.
 * 3. Bed assignment (assignHomes), so a house finished in this tick has its
 *    beds taken by the end of it.
 * 4. On the step into hour 0 of a new day, residents eat and drink
 *    (consumeDailyFood), including what was made in this last hour, and
 *    Wohnraum is updated by whether they have a bed now (updateHousingNeed).
 * 5. Job assignment (assignJobs) at the new hour, so a building finished in
 *    this tick is staffed now and produces from the next tick.
 * 6. Chronicle: the start and the end of the tick are compared, and buildings
 *    that finished and goods that ran out are recorded at the new hour.
 */
export function tick(state: GameState): GameState {
  const next = advanceHour(state);
  const entries = detectEvents(state, next, next.elapsedHours);
  return {
    ...next,
    chronicle: prependEntries(state.chronicle, entries),
    nextChronicleId: state.nextChronicleId + entries.length,
  };
}

/** Steps 1 to 5 of tick: everything except the chronicle. */
function advanceHour(state: GameState): GameState {
  const season = getCalendarAt(state.elapsedHours).season;
  const production = produceHour(state.buildings, state.residents, state.storage, season, state.fieldWheat);
  const advanced = assignHomes({
    ...state,
    elapsedHours: state.elapsedHours + 1,
    storage: production.storage,
    fieldWheat: production.fieldWheat,
    buildings: advanceConstruction(state.buildings),
  });
  if (advanced.elapsedHours % HOURS_PER_DAY !== 0) {
    return assignJobs(advanced);
  }
  const { residents, storage } = consumeDailyFood(advanced.residents, advanced.storage);
  return assignJobs({ ...advanced, residents: updateHousingNeed(residents), storage });
}
