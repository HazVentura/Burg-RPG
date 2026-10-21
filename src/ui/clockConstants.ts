// Real-time pacing from docs/vision.md, section 4 "Zeit":
// "Bei 1x: 1 Spieltag (24 Ticks) pro echter Minute."
// Kept DOM-free so the clock logic can be unit-tested in Node.

import { HOURS_PER_DAY } from "../sim/timeConstants";

/** Real milliseconds one game day takes at speed 1x. */
export const REAL_MS_PER_GAME_DAY = 60_000;

/** Real milliseconds per tick (one game hour) at 1x; derived, not a literal. */
export const MS_PER_TICK = REAL_MS_PER_GAME_DAY / HOURS_PER_DAY;

/** The speeds the player can choose. */
export const SPEEDS = [1, 2, 4] as const;

export type Speed = (typeof SPEEDS)[number];

/**
 * Longest real time a single update may count. Longer gaps (background tab,
 * sleeping laptop) are dropped on purpose so the game never fires a burst of ticks.
 */
export const MAX_ELAPSED_MS_PER_UPDATE = 1_000;
