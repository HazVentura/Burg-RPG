# Build: 013-playable-start

## Round 1
- What changed:
  - `src/sim/jobConstants.ts` (new): frozen `START_JOB_TARGETS` (2, 2, 1, 1, 2) with the worked-out reason in a comment.
  - `src/sim/state.ts`: `createJobTargets` returns a fresh copy of `START_JOB_TARGETS`; unused `JOBS` import dropped.
  - `tests/opening.test.ts` (new): AC1 to AC6 and AC8, scenario tests with `orderBuilding` and `tick` only.
  - `tests/assignment.test.ts`: start-state tests now expect `START_JOB_TARGETS` (still check one key per job, fresh object, nobody works without buildings); the `wellAndField` fixture sets explicit all-zero targets so the setJobTarget/setPinnedJob tests check what they checked before.
  - `tests/state.test.ts`: the 960-tick exact-shape check expects `START_JOB_TARGETS`.
  - `tests/buildings.test.ts`: the "consumption the same on a midnight tick" comparison starts from explicit zero targets, since its point is consumption, not staffing.
  - `tests/formatResidents.test.ts`: initial-state row test expects targets 2, 2, 1, 1, 2 and "0 von 0 Plätzen besetzt"; `withFinishedWell` fixture uses explicit zero targets.
  - `tests/formatBuildings.test.ts`: a finished well now shows "2 von 2 Plätzen besetzt" (the intended new behavior).
  - Note on AC9: the spec named three files; the change also touched assignment/pin tests, buildings, formatBuildings and formatResidents tests that built on the all-zero start. None were deleted; fixtures got explicit zero targets where the test is about something else.
- AC1: `tests/opening.test.ts` "START_JOB_TARGETS (AC1)" (frozen, keys, values, sum 8, chain covered by RECIPES); constant at `src/sim/jobConstants.ts`.
- AC2: `tests/opening.test.ts` "createInitialState with start wish numbers (AC2)"; `tests/assignment.test.ts` "state fields".
- AC3: `tests/opening.test.ts` "a new game without player action (AC3)" (water 0 at tick 120, all water needs < 100 at tick 144, nobody works).
- AC4: `tests/opening.test.ts` "start wish numbers act like player-set ones (AC4)" (residents 1 and 2 in the well after tick 24, +1 water on tick 25, setJobTarget to 0 still works).
- AC5: `tests/opening.test.ts` "on day 1 ..." (all orders ok, bakery ordered at hour 29, needs 100 after all 20 midnights, no bread/water "goodRanOut", well 2 / bakery 1 workers when the bakery finishes, every job staffed to its start number at tick 480).
- AC6: `tests/opening.test.ts` "one day late ..." (bakery ordered at hour 53, same assertions; ticks before the orders are watched too).
- AC7: no balance numbers changed; AC5 and AC6 pass with current values.
- AC8: `tests/opening.test.ts` "wish number controls on a new page (AC8)" and `tests/formatResidents.test.ts`; no changes in `src/ui/` or `src/text/de.ts`.
- AC9: existing tests updated as above; `npm run build` passes; no new dependencies.
- Test run: `npm test`, 375 tests, all passing. `npm run build` passes.
