VERDICT: PASS

## Findings
- [minor] The soft hyphen is written as the `­` escape instead of a literal character. Reasonable and documented in build.md; the runtime string is identical and the tests check it.
- [minor] AC1 (breaking at 180 px) and the visually hidden mark cannot be tested in Vitest without a DOM library. The play review should check them in a browser.
- All other ACs (AC2 to AC11) match the code and have tests. `missingBuildingsFor` is pure and reuses `producersOf` and `JOB_BUILDING`. The cause texts are a `Record<BuildingType, string>` in `de.ts`. The UI toggles the mark through `hidden` and builds it once. There are no new dependencies and still one media query.

## Tests
`npm test` (in .worktrees/016-chain-panel-fixes): 424 tests, all passed
