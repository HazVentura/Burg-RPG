// The game clock turns real elapsed time into a number of due ticks.
// It is pure and DOM-free: the browser loop measures time and passes it in,
// which keeps the pacing rules testable without timers.

import { MAX_ELAPSED_MS_PER_UPDATE, MS_PER_TICK, type Speed } from "./clockConstants";

export interface ClockState {
  paused: boolean;
  speed: Speed;
  /**
   * Leftover time in "1x milliseconds" that has not produced a tick yet.
   * Storing it already scaled by speed makes a speed change take effect at once
   * without losing the part of a tick that has already passed.
   */
  carryMs: number;
}

export function createClock(): ClockState {
  return { paused: false, speed: 1, carryMs: 0 };
}

export function setPaused(clock: ClockState, paused: boolean): ClockState {
  return { ...clock, paused };
}

export function togglePaused(clock: ClockState): ClockState {
  return setPaused(clock, !clock.paused);
}

/** Changing speed never resumes a paused game. */
export function setSpeed(clock: ClockState, speed: Speed): ClockState {
  return { ...clock, speed };
}

export function advanceClock(
  clock: ClockState,
  elapsedMs: number,
): { clock: ClockState; ticks: number } {
  // Paused time and invalid input do not count; the carry stays as it was.
  if (clock.paused || !Number.isFinite(elapsedMs) || elapsedMs <= 0) {
    return { clock, ticks: 0 };
  }

  const counted = Math.min(elapsedMs, MAX_ELAPSED_MS_PER_UPDATE);
  const total = clock.carryMs + counted * clock.speed;
  const ticks = Math.floor(total / MS_PER_TICK);

  return {
    clock: { ...clock, carryMs: total - ticks * MS_PER_TICK },
    ticks,
  };
}
