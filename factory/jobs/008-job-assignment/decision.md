APPROVE

## Why
Round 1 has `VERDICT: PASS` from all four reviewers (code, security, UI, UX), and every finding is minor. I ran `npm test` (272/272 pass) and `npm run build` (passes) in `.worktrees/008-job-assignment` myself. The diff touches only `src/sim/` and `tests/`. It adds no dependencies and changes nothing in `src/ui/`, `src/main.ts` or `src/text/de.ts`. The five passes in `assignJobs` match AC4 to AC7, `tick` runs the distribution last on both the midnight and the non-midnight branch, and the AC9 sequence is tested exactly as the spec describes it.

## For the human
What gets merged:
- A new `src/sim/assignment.ts` with `assignJobs`, a pure and idempotent function that hands out workplaces based on wish numbers and pins. It also has a `getJob` helper.
- Two new commands, `setJobTarget` and `setPinnedJob`, in `src/sim/commands.ts`.
- A new field `GameState.jobTargets`. Every wish number starts at 0.
- A new field `Resident.pinnedJob`, which starts as `null`.
- A new constant `ADULT_AGE_YEARS = 5`, which `START_AGE_MIN_YEARS` now uses.
- Tests, including a sweep over 300 seeded states.

Because every wish number starts at 0, the running page behaves exactly as before. Changes to existing tests were needed for the new fields, and none of them drop a check. The only expectation that changed is that invalid workplace ids are now cleared after a tick, which AC4 requires.

Follow-ups for later jobs, not blocking this one:
- The commands do not check at runtime that `job` is one of `JOBS` (from the security review). This should be added when the resident-list UI or save loading starts sending job strings.
- The new failure reasons need German text when the UI lands (from the UX review).
