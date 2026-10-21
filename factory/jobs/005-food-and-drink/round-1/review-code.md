VERDICT: PASS

## Findings
- [minor] `src/sim/needs.ts`: the `?? NEED_MAX` and `?? { ...resident.needs }` fallbacks are unreachable. They are only there for `noUncheckedIndexedAccess`, as the spec allows, so this is acceptable.
- All 14 acceptance criteria are covered by tests, and the claims in build.md match the code. The sim core stays pure. Constants live in `needConstants.ts`. There are no new dependencies and no UI changes.

## Tests
`npm test` (in .worktrees/005-food-and-drink): 150 tests, all passed
