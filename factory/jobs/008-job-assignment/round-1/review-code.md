VERDICT: PASS

## Findings
- [minor] `src/sim/state.ts`: the `assignJobs` import is placed after `buildingConstants` and before `buildings`, so imports are not alphabetical like the rest of the file. Cosmetic only.
- [minor] `src/sim/assignment.ts`: `next[index] ?? null` and the `id === undefined` checks only exist to satisfy `noUncheckedIndexedAccess`. This is harmless, but a `number | null` array built with a typed helper would be slightly cleaner.
- [minor] `getJob` is exported but unused in `src/`. The spec suggested it as an optional helper, so this is acceptable. Check that it is covered by a test, or drop it if it is not.

Review notes: all five passes match AC4 to AC7. Keeping before placing is what makes the function idempotent, and the quota formula reserves room for pinned residents. Residents whose workplace does not change keep the same reference. `tick` calls `assignJobs` last on both branches (AC13). The commands do not mutate their input and return discriminated unions (AC10 to AC12). The sim core has no DOM, `Date.now` or `Math.random` calls. There are no new dependencies and no changes to `src/ui`, `src/main.ts` or `src/text/de.ts`. The tests cover AC1 to AC15, including the AC9 sequence and a 300-seed property sweep. The changes to existing tests are justified and keep their original checks.

## Tests
`npm test` (in .worktrees/008-job-assignment): 272 tests, all passed
