VERDICT: PASS

## Findings
- [minor] AC13 says a focused "-" button keeps focus, but it becomes disabled at 0 and the browser drops focus. build.md notes this and the spec demands `disabled`, so it is acceptable. Consider moving focus to "+" in a later job.
- [minor] `updateResidentRow` and `updateJobTargetView` silently `continue` when a view is missing. Those branches cannot happen, so they are harmless but dead.
- [minor] No automated test covers app.ts (no DOM test library is allowed). AC7 to AC16 rest on the build.md manual checks; the code matches those claims. The 200 % text size was not checked in a browser.

Correctness and conventions are fine. The sim guard (`isJob`) is minimal and tested. The formatters are pure and tested. All strings are in de.ts. There is no innerHTML, a single role="alert", state is replaced only through command results, and there are no new dependencies. `src/sim/` changed only for AC1.

## Tests
`npm test` (in .worktrees/010-resident-list): 304 tests, all passed
