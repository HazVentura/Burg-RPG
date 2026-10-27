VERDICT: PASS

## Findings
- [minor] `updateHousingNeed` in src/sim/needs.ts allocates new resident and needs objects at every midnight, even for housed residents already at 100. Harmless (consumeDailyFood does the same), so no change is required.
- [minor] `buildingDisplayNames` moved into a new src/ui/buildingNames.ts to avoid a circular import. This is a reasonable choice, and the re-export keeps the existing imports working.
- No blockers. Each acceptance criterion (AC1 to AC14) maps to tests in tests/housing.test.ts and the updated format and fixture tests. The build.md claims match the code. assignHomes is pure, idempotent and returns the input state when nothing changes. The tick order and its comment are correct. Housing is kept out of the goods loop. The balance constant lives in needConstants.ts. There are no new dependencies and no DOM or randomness in src/sim.

## Tests
`npm test` (in .worktrees/018-housing-beds): 495 tests, all passing
