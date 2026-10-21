// The complete game state and the tick that advances it.
// GameState is plain JSON-compatible data so that later save games can store
// it with JSON.stringify and restore it unchanged.

import type { Storage } from "./goods";
import { createRandom } from "./random";
import { INITIAL_STORAGE } from "./storageConstants";

export interface GameState {
  /** Game hours since the start of the game; one tick adds one hour. */
  elapsedHours: number;
  /** Random generator state; continue with createRandom(state.rngState). */
  rngState: number;
  /** Central castle storage: the stock of every good. */
  storage: Storage;
}

export function createInitialState(seed: number): GameState {
  return {
    elapsedHours: 0,
    rngState: createRandom(seed).seed,
    // A copy, so changes in one game never leak into the constant or another game.
    storage: { ...INITIAL_STORAGE },
  };
}

/**
 * Advances the game by one hour. Returns a new state, never mutates the input.
 * Unchanged nested objects such as storage are shared with the input, not copied.
 */
export function tick(state: GameState): GameState {
  return {
    ...state,
    elapsedHours: state.elapsedHours + 1,
  };
}
