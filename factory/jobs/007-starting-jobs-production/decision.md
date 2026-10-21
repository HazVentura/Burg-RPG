APPROVE

## Why
All four round-1 reviewers return `VERDICT: PASS`. In `.worktrees/007-starting-jobs-production`, `npm test` passes (222 tests) and so does `npm run build`. The diff stays inside the spec: three new files in `src/sim/`, small edits to `residents.ts` and `state.ts`, new tests, and narrow updates to existing tests. There are no new dependencies and no changes to `src/ui/`, `src/main.ts` or `src/text/de.ts`.

## For the human
What gets merged: the five starting jobs (`src/sim/jobs.ts`) and the frozen recipe table (`src/sim/productionConstants.ts`, the only place the numbers live). It also adds a pure `produceHour` step (`src/sim/production.ts`). In each tick it runs before construction and before the midnight meal. Workers are capped per building at its number of workplaces, and a worker uses inputs fully or not at all.
`Resident` gets one new field, `workplaceId: number | null`. Every settler starts with `null`, so a new game plays exactly as before.
The three existing tests that the new field affected were only extended (key list, hand-made residents, exact-state check) and still check what they did before.
This adds a field to the saved state, but there is no save/load yet, so it is easy to undo. The recipe numbers are the builder's own assumption (the vision gives none) and can be retuned in one file.
