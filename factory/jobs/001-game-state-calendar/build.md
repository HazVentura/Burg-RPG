# Build: 001-game-state-calendar

## Round 1
- What changed:
  - `src/sim/timeConstants.ts` (new): the one time constants module: `HOURS_PER_DAY`, `DAYS_PER_SEASON`, `SEASONS` (as const), `SEASONS_PER_YEAR` (= `SEASONS.length`), `FIRST_YEAR`, `FIRST_DAY_OF_SEASON`.
  - `src/sim/state.ts` (new): `GameState { elapsedHours, rngState }`, `createInitialState(seed)`, pure `tick(state)`.
  - `src/sim/calendar.ts` (new): `Season` (derived from `SEASONS`), `Calendar`, `getCalendar(state)` derived from `elapsedHours` with the named constants. `SEASONS[index]` is narrowed with an explicit `undefined` check that throws a `RangeError` (no `!`); unreachable for valid states.
  - `tests/state.test.ts` (new): initial state, seeds, tick, purity, determinism, JSON round trip.
  - `tests/calendar.test.ts` (new): constants, initial calendar, rollover table, ranges, unbounded years.
  - `src/ui/` and `src/text/de.ts` unchanged.
- AC1: met by `src/sim/state.ts` (`GameState`, `createInitialState`, `tick`) and `src/sim/calendar.ts` (`getCalendar`, `Calendar`, `Season`); compiled by `npm run build`.
- AC2: met by `tests/state.test.ts` "survives a JSON round trip for the initial state", "survives a JSON round trip after ticks" (1, 24, 240, 960, 1000 ticks, `toStrictEqual`), "is a plain object holding only finite numbers".
- AC3: met by `tests/state.test.ts` "starts with zero elapsed hours", "raises elapsedHours by exactly 1", "raises elapsedHours by N after N ticks", "keeps elapsedHours a non-negative integer".
- AC4: met by `tests/state.test.ts` "stores the random generator state for the seed", "maps a seed of 0 to rngState 0", "maps a negative seed to its unsigned 32-bit value" (-1 -> 4294967295), "leaves rngState unchanged".
- AC5: met by `src/sim/calendar.ts:27-38`; `tests/calendar.test.ts` "stays within its ranges for every hour of two years", "keeps counting years without an upper limit" (year 1000), "match the vision" (season order).
- AC6: met by `tests/calendar.test.ts` "starts in spring, year 1, day 1, hour 0".
- AC7: met by `tests/calendar.test.ts` `it.each(cases)` "after %i ticks returns %o": all nine spec cases plus 479, 719, 961.
- AC8: met by `tests/state.test.ts` "does not mutate its argument", "returns a new object", "gives deep-equal output for the same input", "does not mutate any state over 960 ticks" (960-tick loop checking each step), "gives the same result when a run of 960 ticks is repeated"; `tests/calendar.test.ts` "does not mutate the state" for `getCalendar`.
- AC9: met by `tests/state.test.ts` "gives deep-equal states for the same seed", "gives different rngStates for different seeds".
- AC10: met by `src/sim/timeConstants.ts`; `src/sim/calendar.ts:28-36` uses only those constants (no inline 24/10/4); `tests/calendar.test.ts` "match the vision" pins the values.
- AC11: `npm test` and `npm run build` both pass.
- Test run: `npm test`, 38 tests in 3 files (35 new), all passing. `npm run build` passes (tsc + vite).
- Note: the worktree had no `node_modules`, so I added an untracked symlink `node_modules -> ../../node_modules` to run the tests. It is not committed.
- Commits: `63a75f9` Add game state, tick and derived calendar to the sim core; `9ca14f0` Test game state, tick purity and calendar rollover.
