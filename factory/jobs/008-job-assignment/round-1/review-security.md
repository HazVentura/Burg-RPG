VERDICT: PASS

## Findings
- [minor] src/sim/commands.ts:289 and :305: `job` is only checked at compile time. Nothing in the UI calls these commands yet, but once the resident list (step 3) or save loading (step 7) sends a job string at runtime, `setJobTarget(state, "foo", 1)` adds an extra key to `jobTargets`, which breaks AC1's "one key per job, nothing else" and ends up in the saved state. `setPinnedJob` would store an unknown `pinnedJob`. Neither one crashes: `pinned["foo"]` becomes NaN, `takeFree` returns null and the resident just waits idle. Prototype keys (`__proto__`, `constructor`) used as computed keys in an object literal or for counters are also harmless here. Fix (optional now, needed before UI or save import): reject jobs that are not in `JOBS` with `(JOBS as readonly string[]).includes(job)` and return a reason such as `"unknownJob"`.
- [minor] src/sim/assignment.ts:185: if a later save import gives a `jobTargets` that is missing a key or has a non-number value, `autoQuota` becomes NaN and that job silently gets no automatic workers. This fails safe (no crash, no over-staffing). Save validation is out of scope (step 7), so this is only a note for that job.

## Checked
- Input validation: `setJobTarget` rejects negative values, fractions, NaN and Infinity with `Number.isInteger`. Very large integers are capped by `min(target, slots)`, so a huge number cannot over-allocate or loop.
- `setPinnedJob`: an unknown resident id and pinning a child are rejected, and a failed command returns without building a new state.
- No mutation of input: `assignJobs` mutates only its local `workplaces` map and arrays, and residents and state are copied when they change.
- Resource use: `assignJobs` runs in O(residents x buildings) per tick, with no growth of in-memory state across ticks and no recursion. Loops are bounded by list sizes.
- Building cap: the `room` count stops overfilling even with hand-made overfull states.
- Determinism: no `Math.random`, `Date.now` or DOM access in the new code. Runs are single-threaded and pure, so there are no race conditions.
- Output/HTML and URLs: no changes in `src/ui/`, `src/main.ts` or `src/text/de.ts`, and nothing new is rendered and no links are built.
- Secrets and debug output: no `console.*`, `debugger`, credentials or leftover debug code. No new dependencies.
- Plain JSON state: new fields are plain numbers, strings and null, with no prototype-bearing objects.
- Tests: `npx vitest run` in the worktree passes 272/272.
