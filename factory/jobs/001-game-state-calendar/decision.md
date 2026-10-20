APPROVE

## Why
All four round-1 reviewers (code, security, UI, UX) gave `VERDICT: PASS`. Their only findings are minor and point to the future save/import job. I ran `npm test` (38/38 passing, 3 files) and `npm run build` (tsc + vite) in `.worktrees/001-game-state-calendar` at `9ca14f0`, and both pass. The diff has 5 new files: 3 in `src/sim/` and 2 in `tests/`. It covers AC1 to AC11 with no new dependencies and no changes to `package.json`, `src/ui/` or `src/text/de.ts`.

## For the human
What gets merged: the first simulation state. `GameState { elapsedHours, rngState }` with `createInitialState(seed)` and a pure `tick(state)` in `src/sim/state.ts`. A derived `getCalendar(state)` returning `{ year, season, day, hour }` in `src/sim/calendar.ts`. One time constants module, `src/sim/timeConstants.ts` (24 h/day, 10 days/season, `SEASONS` array). Tests cover every rollover case in the spec, purity, determinism and the JSON round trip. Nothing is persisted yet, so the state shape is easy to change later.

Things to keep in mind:
- The game starts at hour 0 (midnight) on day 1. The spec assumed this because the vision does not say. Change it if you want a different start hour.
- For step 7 (save/import), validate loaded state at that boundary: `elapsedHours` a safe non-negative integer, `rngState` a uint32. `getCalendar` does not reject non-integer hours.
- There is no `src/sim/index.ts` barrel, so consumers import from each module directly.
