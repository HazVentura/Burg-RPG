APPROVE

## Why
All five reviewers (security, ux, ui, code, play) gave `VERDICT: PASS` in round 1, with only minor findings. I ran `npm test` (495 passed) and `npm run build` in `.worktrees/018-housing-beds` and both passed. The diff matches AC1 to AC14, adds no dependencies, and touches only files the spec names, plus a `buildingNames.ts` split that avoids a circular import and a one-line CSS label width change.

## For the human
What gets merged:
- `src/sim/housing.ts`: `assignHomes` gives beds in finished houses. It keeps existing homes first, then fills free beds in building order. It is pure and idempotent, and returns the same state when nothing changes.
- `Resident.homeId` and a new `housing` need (Wohnraum). At midnight the need refills to 100 with a bed and drops by 15 without one (`HOUSING_DROP_PER_DAY_WITHOUT`). `tick` runs bed assignment after construction and before the midnight step.
- Display: a third need bar "Wohnraum", an "Unterkunft" fact ("Wohnhaus N" / "Obdachlos"), a summary row "Obdachlos" that is always shown, and "x von 4 Betten belegt" on finished houses. `.need label` min-width is now 5.5rem.
- Tests: new `tests/housing.test.ts`. Existing fixtures and assertions were updated, none deleted.

Minor points from the reviews to keep in mind (no action needed):
- At 1280 px and at the 180 px zoom, the need number wraps below the bar. This is partly because of the wider label.
- Homelessness cannot happen in real play until births exist, so the "Obdachlos" state was only checked in unit tests, not on screen.
- The play test showed bread running out on day 9 with seed 42. That is an economy and start-job-targets issue, not caused by this job.
