VERDICT: PASS

## Findings
- [minor] `farmerHour` and `fieldWheatAfterHour` each test the season against `GROWING_SEASONS` and `HARVEST_SEASON`. The "farming season" rule lives in two places. This is acceptable, but a single helper would be simpler.
- [minor] `produceHour` unpacks `runWorkerHours` and rebuilds the same object, dropping `blockedBy`. It works and is clear enough.
- AC1 to AC13 are covered: the new `tests/farming.test.ts`, the updated production, shortages, opening, storage, state and formatStorage tests, and the comments in the constants files. The `build.md` claims match the diff. The sim stays pure, the strings are in `de.ts`, the constants are in their own module, and there are no new dependencies.

## Tests
`npm test` (in `.worktrees/017-wheat-and-seasons`): 454 tests, all passing.
