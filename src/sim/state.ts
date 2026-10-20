// The complete game state and the tick that advances it.
// GameState is plain JSON-compatible data so that later save games can store
// it with JSON.stringify and restore it unchanged.

import { createRandom } from "./random";

export interface GameState {
  /** Game hours since the start of the game; one tick adds one hour. */
  elapsedHours: number;
  /** Random generator state; continue with createRandom(state.rngState). */
  rngState: number;
}

export function createInitialState(seed: number): GameState {
  return {
    elapsedHours: 0,
    rngState: createRandom(seed).seed,
  };
}

/** Advances the game by one hour. Returns a new state, never mutates the input. */
export function tick(state: GameState): GameState {
  return {
    ...state,
    elapsedHours: state.elapsedHours + 1,
  };
}
