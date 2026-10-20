# Game state and calendar in the simulation core

## Goal
The simulation core gets its first game state: `createInitialState(seed)` starts a game in spring, year 1, day 1, and `tick(state)` advances it by one game hour. Every later feature (clock, warehouse, residents, seasons, saving) builds on this state and its calendar, so it must be pure, deterministic and fully tested.

Rules from `docs/vision.md`, section 4 "Zeit":
- "1 Tick = 1 Spielstunde." 24 hours per day.
- "4 Jahreszeiten zu je 10 Tagen, ein Spieljahr = 40 Tage"
- "Start: Frühling, Jahr 1, Tag 1."

## Acceptance criteria
- AC1: `src/sim/` exports a `GameState` type, `createInitialState(seed: number): GameState` and `tick(state: GameState): GameState`.
- AC2: `GameState` is plain data with no functions, class instances, `Date`s, `Map`s or `Set`s. `JSON.parse(JSON.stringify(state))` deep-equals the original state, both for the initial state and after ticks.
- AC3: `GameState` holds the elapsed game time as one non-negative integer of hours since the start, `elapsedHours`. `createInitialState` sets it to `0`, and each `tick` raises it by exactly 1.
- AC4: `GameState` stores the random generator state as `rngState: number`, so later features can call `createRandom(state.rngState)`. `createInitialState(seed)` sets it to `createRandom(seed).seed` (that is, `seed >>> 0`). `tick` leaves it unchanged, because nothing in this job uses randomness.
- AC5: A pure function `getCalendar(state: GameState): Calendar` returns `{ year, season, day, hour }`:
  - `year`: integer starting at 1, with no upper limit
  - `season`: one of `"spring" | "summer" | "autumn" | "winter"` (exported type `Season`), in that order within a year
  - `day`: the day within the current season, 1 to 10
  - `hour`: the hour of the day, 0 to 23
- AC6: For the initial state, `getCalendar` returns `{ year: 1, season: "spring", day: 1, hour: 0 }`.
- AC7: The calendar rolls over correctly. Expected `getCalendar` results after N ticks from the initial state:
  - 1 → year 1, spring, day 1, hour 1
  - 23 → year 1, spring, day 1, hour 23
  - 24 → year 1, spring, day 2, hour 0
  - 239 → year 1, spring, day 10, hour 23
  - 240 → year 1, summer, day 1, hour 0
  - 480 → year 1, autumn, day 1, hour 0
  - 720 → year 1, winter, day 1, hour 0
  - 959 → year 1, winter, day 10, hour 23
  - 960 → year 2, spring, day 1, hour 0
- AC8: `tick` is pure. It does not mutate its argument: the input state deep-equals a copy taken before the call. It returns a new object. The same input always gives a deep-equal output.
- AC9: `createInitialState` is deterministic. The same seed gives deep-equal states, and different seeds give different `rngState`s.
- AC10: The calendar numbers (24 hours per day, 10 days per season, 4 seasons per year) live as named constants in one time constants module in `src/sim/`, not inline. `getCalendar` derives its results from those constants.
- AC11: Unit tests in `tests/` cover AC2 to AC9. `npm test` and `npm run build` both pass.

## Out of scope
- Real-time loop, pause, speed 1x/2x/4x and any clock display in the UI. These belong to the next backlog item, so `src/ui/` and `src/text/de.ts` stay unchanged.
- German season names or date formatting.
- Warehouse, residents, buildings or any other state beyond time and the random state.
- Save game version number, `localStorage`, export/import. These belong to step 7.
- Season-dependent rules such as wheat growth or heating.
- Day of year and total day counters beyond what `getCalendar` returns.
- Commands or actions sent to the core besides `tick`.

## Notes for the builder
- New files, for example `src/sim/state.ts` (`GameState`, `createInitialState`, `tick`), `src/sim/calendar.ts` (`Calendar`, `Season`, `getCalendar`) and a time constants module such as `src/sim/timeConstants.ts`. Exact file names are up to you, but keep one constants module for the time area as `CLAUDE.md` requires.
- Storing only `elapsedHours` and deriving the calendar avoids impossible states such as day 11 or hour 24. Derive it with integer division and modulo: hour = h % 24; total days = floor(h / 24); day = totalDays % 10 + 1; season index = floor(totalDays / 10) % 4; year = floor(totalDays / 40) + 1. Use these as a cross-check, but write them with the named constants.
- Keep the season order in one array constant, for example `SEASONS = ["spring", "summer", "autumn", "winter"] as const`, and derive `Season` from it. Later jobs will index into it.
- Follow the style of `src/sim/random.ts` and `tests/random.test.ts`: a short header comment that explains why, Vitest globals (`describe`/`it`/`expect`, no import needed), and fixed seeds in tests (for example 42).
- `tsconfig` has `noUncheckedIndexedAccess`, so indexing into `SEASONS` returns `Season | undefined`. Handle that cleanly, without a blind `!` if you can avoid one.
- Edge cases to test: the last hour of a day, season and year (the 23, 239 and 959 cases), the first hour after each rollover, a seed of 0, and a negative seed such as -1 (`>>> 0` maps it to 4294967295). For AC8, apply `tick` 960 times in a loop and check the result matches.
- Start hour 0 (midnight) is an assumption, because the vision only says "Tag 1". If the orchestrator wants a different start hour, AC6 and AC7 are the only places to change.
