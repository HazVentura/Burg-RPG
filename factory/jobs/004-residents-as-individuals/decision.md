APPROVE

## Why
In round 1, all four reviewers (code, security, UI, UX) gave `VERDICT: PASS`. I ran the checks again in `.worktrees/004-residents-as-individuals`: `npm test` passes all 123 tests in 9 files, and `npm run build` passes. The diff touches only `src/sim/` and `tests/`. It adds no dependencies, leaves `src/ui/`, `src/main.ts` and `src/text/de.ts` alone, and changes the old `rngState` tests in `tests/state.test.ts` without deleting any. The `GameState` shape grows, but nothing saves games yet (that comes in step 7), so the change is easy to undo.

## For the human
What gets merged:
- `GameState` gets `residents` and `nextResidentId`. A new game starts with 4 seeded couples (8 adults, ids 1 to 8). Each couple is one woman and one man, partnered with each other. Ages are 5 to 10 game years. Age is worked out from `bornAtHour`, not stored.
- New files: `src/sim/residents.ts`, `src/sim/names.ts` (32 female and 32 male medieval given names, and `pickName`) and `src/sim/residentConstants.ts`. `src/sim/timeConstants.ts` gets `DAYS_PER_YEAR` and `HOURS_PER_YEAR`.
- `rngState` now holds the generator state after the settlers are drawn, not `seed >>> 0`.
- There is no change you can see in the game.

These assumptions from the spec were not confirmed and you may want to check them: start ages of 5 to 10 years, sex values `female`/`male`, given names only, and only woman-and-man starting couples. Each is a constant or one line to change.
