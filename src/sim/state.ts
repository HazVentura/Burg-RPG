// The complete game state and the tick that advances it.
// GameState is plain JSON-compatible data so that later save games can store
// it with JSON.stringify and restore it unchanged.

import type { Storage } from "./goods";
import { consumeDailyFood } from "./needs";
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
  };
}

/**
 * Advances the game by one hour. Returns a new state, never mutates the input.
 * Unchanged nested objects such as storage and residents are shared with the input, not copied.
 * On the step into hour 0 of a new day, residents eat and drink (consumeDailyFood).
 */
export function tick(state: GameState): GameState {
  const advanced: GameState = {
    ...state,
    elapsedHours: state.elapsedHours + 1,
  };
  if (advanced.elapsedHours % HOURS_PER_DAY !== 0) {
    return advanced;
  }
  const { residents, storage } = consumeDailyFood(advanced.residents, advanced.storage);
  return { ...advanced, residents, storage };
}
