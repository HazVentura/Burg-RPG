VERDICT: PASS

## Findings
- [minor] `src/sim/state.ts` does not re-export from a `src/sim/index.ts`; AC1 says `src/sim/` exports the API, which is met per-module. Optional: add an index later if consumers want a single import.
- [minor] `seasonAt` throws a RangeError branch that is untested (unreachable for valid states). Acceptable.

All ACs (AC1-AC11) are covered by tests or code. Pure core, no DOM/Date/random, constants in one module, no new dependencies, no dead code.

## Tests
`npm test` (in .worktrees/001-game-state-calendar): 38 tests, all passed
