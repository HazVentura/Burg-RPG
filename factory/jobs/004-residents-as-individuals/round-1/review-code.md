VERDICT: PASS

## Findings
- [minor] `src/sim/names.ts` has a circular type-only import with `residents.ts` (`Sex`). It is harmless (`import type`), but `SEXES`/`Sex` could live in a leaf module later.
- [minor] The unreachable `RangeError` branch in `pickName` is needed for `noUncheckedIndexedAccess`; acceptable and matches the `seasonAt` convention.
- All ACs 1-18 are implemented and covered by tests. The draw order is fixed and documented. `rngState` comes from `random.seed`. No UI, `main.ts`, `de.ts` or dependency changes. The sim core stays pure.

## Tests
`npm test` (in .worktrees/004-residents-as-individuals): 123 tests, all passed. `npm run build` passes.
