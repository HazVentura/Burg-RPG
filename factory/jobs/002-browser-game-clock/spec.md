# Spieluhr im Browser (browser game clock)

## Goal
The game runs in the browser in real time. A loop calls `tick` so that at 1x one game day (24 ticks) passes per real minute. The player can pause, choose speed 1x, 2x or 4x, and sees the current date, season and time of day. This is the first time the simulation core is visible and controllable on the page.

Rules from `docs/vision.md`:
- Section 2: "Zeit | Echtzeit mit Ticks, Pause und Tempo (1x, 2x, 4x)"
- Section 4: "1 Tick = 1 Spielstunde. Bei 1x: 1 Spieltag (24 Ticks) pro echter Minute."
- Section 4: "Start: Frühling, Jahr 1, Tag 1." (already implemented by `createInitialState` and `getCalendar` in job 001)

## Acceptance criteria

### Clock logic (pure, DOM-free, unit-tested)
- AC1: A DOM-free module in `src/ui/` (for example `src/ui/clock.ts`) exports a `ClockState` type holding `paused: boolean`, `speed: 1 | 2 | 4` and the leftover real time that has not yet produced a tick. `ClockState` is plain data. A function `createClock()` returns the starting clock: not paused, speed 1.
- AC2: A pure function `advanceClock(clock: ClockState, elapsedMs: number): { clock: ClockState; ticks: number }` computes how many ticks are due after `elapsedMs` real milliseconds. It does not mutate its input and does not read any real time itself (no `Date.now()`, `performance.now()` or timers inside it).
- AC3: Pacing matches the vision. Starting from `createClock()` at the given speed, feeding 60 000 ms in 600 steps of 100 ms gives in total:
  - speed 1 → 24 ticks
  - speed 2 → 48 ticks
  - speed 4 → 96 ticks
  At speed 1, 2 499 ms in total gives 0 ticks and 2 500 ms gives 1 tick.
- AC4: Leftover time carries over between calls, so time is not lost to frame size. Example: 1 250 ms at speed 1 gives 0 ticks, then switching to speed 2 and 625 ms more gives 1 tick.
- AC5: While paused, `advanceClock` returns 0 ticks for any `elapsedMs`. Paused time does not build up and the carry stays unchanged: starting from `createClock()`, pausing, feeding 10 minutes of paused updates, then resuming and advancing 2 500 ms at speed 1 gives exactly 1 tick.
- AC6: Pure functions `setPaused(clock, paused)` (or a toggle) and `setSpeed(clock, speed)` return a new `ClockState`. `setSpeed` does not change `paused`, and pausing does not change `speed`.
- AC7: A single update never produces a burst of ticks after a long gap (for example a background tab or a sleeping laptop). `advanceClock` treats `elapsedMs` above a named cap (`MAX_ELAPSED_MS_PER_UPDATE`, start value 1 000 ms) as the cap. Negative, `NaN` or infinite `elapsedMs` counts as 0 and leaves the carry unchanged. Test: starting from `createClock()` at speed 4, one call with 600 000 ms gives exactly 1 tick (1 000 ms × 4 = 4 000 ms of 1x time, 2 500 ms per tick).
- AC8: The pacing numbers live in one constants module (for example `src/ui/clockConstants.ts`): real milliseconds per game day at 1x (`60_000`), the allowed speeds `[1, 2, 4]` and `MAX_ELAPSED_MS_PER_UPDATE`. Milliseconds per tick is derived from `HOURS_PER_DAY` in `src/sim/timeConstants.ts` (60 000 / 24 = 2 500), not written as a literal.

### Display text (pure, unit-tested)
- AC9: `src/text/de.ts` holds every new player-facing string: the German season names (spring "Frühling", summer "Sommer", autumn "Herbst", winter "Winter", keyed by the `Season` type so a missing season is a type error), the labels "Datum", "Jahreszeit", "Uhrzeit", the button texts "Pause", "Weiter", "1x", "2x", "4x" and the speed group label "Tempo".
- AC10: A pure formatting function (for example `formatClock(calendar: Calendar)` in `src/ui/`) turns a `Calendar` into the three display strings:
  - date: `Tag <day>, Jahr <year>`, for example `Tag 1, Jahr 1`
  - season: the German season name, for example `Frühling`
  - time: two-digit hour, then `:00 Uhr`, for example `00:00 Uhr`, `07:00 Uhr`, `23:00 Uhr`
  Tests cover the initial state (`Tag 1, Jahr 1` / `Frühling` / `00:00 Uhr`) and at least one state in each other season and in year 2.

### Page (checked by reading the code and running `npm run dev`)
- AC11: On page load `src/main.ts` creates a `GameState` with `createInitialState(seed)` and starts the loop. The seed is chosen outside `src/sim/` (a fixed constant or a value from the UI layer). Nothing in `src/sim/` changes.
- AC12: The loop uses `requestAnimationFrame` and measures elapsed time with a monotonic clock (the `requestAnimationFrame` timestamp or `performance.now()`, never `Date.now()`). Each frame it calls `advanceClock`, then applies `tick` exactly `ticks` times to the current `GameState`. The loop replaces its state reference with the result of `tick`. It never edits the `GameState` object.
- AC13: The page shows the existing title and tagline plus a clock section with the date, season and time from AC10, each with its visible label from AC9. The display updates after each tick and shows `Tag 1, Jahr 1`, `Frühling`, `00:00 Uhr` right after load.
- AC14: A pause button shows "Pause" while running and "Weiter" while paused, and toggles the clock. When paused, the displayed time stops changing. The paused state is visible from the button text, not only from color.
- AC15: Three speed buttons "1x", "2x", "4x" sit in a group with an accessible name "Tempo" (for example `role="group"` with `aria-label`). The active speed has `aria-pressed="true"`, the others `aria-pressed="false"`, and the active one is also visually distinct. Choosing a speed while paused changes the speed but stays paused (AC6).
- AC16: All controls are native `<button type="button">` elements, so mouse, touch and keyboard (Tab, Enter, Space) work. Updating the clock display does not replace the button elements, so a focused button keeps keyboard focus while time runs.
- AC17: The clock display is not an `aria-live` region, so screen readers are not interrupted every few seconds.
- AC18: The clock section fits a 360 px wide viewport without horizontal scrolling. Buttons are at least 44 × 44 CSS pixels.
- AC19: `npm test` and `npm run build` pass. No new dependencies in `package.json`.

## Out of scope
- Saving pause or speed, or the game state, in `localStorage` (step 7).
- Catching up on game time that passed while the tab was hidden or the device slept. Capped time is dropped on purpose (AC7).
- Keyboard shortcuts (for example Space for pause).
- Minute-level time display. The game only has whole hours, so the time always ends in `:00`.
- Day/night visuals, season colors or icons.
- The full header layout with warehouse, residents and buildings areas (backlog item "Grundlayout der Verwaltungsoberfläche"). This job only adds a clock section to the existing page.
- Speeds other than 1x, 2x and 4x, or a "fast forward" key.
- Changes to `GameState`, `tick` or `getCalendar`.
- DOM tests with jsdom or a browser test runner. Only the pure modules get unit tests.

## Notes for the builder
- Files likely touched: new `src/ui/clock.ts`, `src/ui/clockConstants.ts`, a formatter (in `src/ui/clock.ts` or its own file), `src/ui/app.ts`, `src/main.ts`, `src/text/de.ts`, possibly a small stylesheet imported from `src/main.ts` (for example `src/ui/styles.css`). New tests, for example `tests/clock.test.ts` and `tests/formatClock.test.ts`.
- Vitest runs with `environment: "node"`. `clock.ts`, the constants module and the formatter must not touch `window`, `document` or `requestAnimationFrame`, including at import time, or the tests will fail. Keep the `requestAnimationFrame` loop and DOM code in `app.ts` or a separate loop file.
- Accumulate leftover time in "1x milliseconds": add `elapsedMs * speed` to the carry, then `ticks = Math.floor(carry / MS_PER_TICK)` and keep the remainder. This makes AC3 and AC4 hold and makes a speed change take effect at once. The tests in AC3 use 100 ms steps so the float sums stay exact.
- On the first frame after load, and after a pause, the elapsed time since the last frame can be large. Measure from the previous frame's timestamp and let the AC7 cap handle the rest. The `requestAnimationFrame` callback gets a `DOMHighResTimeStamp` you can use instead of calling `performance.now()` yourself.
- `renderApp` currently writes the whole page with `innerHTML`. Build the clock section once, keep references to the three value elements and the buttons, and only update `textContent` and `aria-pressed` afterwards (AC16). Use `textContent`, not `innerHTML`, for values.
- Follow job 001 patterns: a short header comment that explains why, Vitest globals, and a typed season map such as `Record<Season, string>` in `de.ts` (AC9). `noUncheckedIndexedAccess` is on, and a `Record<Season, string>` lookup avoids `undefined`.
- Edge cases to test: hour 0 and 23 padding, day 10, the year 2 rollover (960 ticks), speed change with a half-tick carry, paused updates, `elapsedMs` of 0, negative, `NaN`, `Infinity` and far above the cap.
- Assumptions to confirm with the orchestrator: the game starts running at 1x (not paused), and choosing a speed does not resume a paused game. Both are one-line changes in `createClock` and `setSpeed`.
