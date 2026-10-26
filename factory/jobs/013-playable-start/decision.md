APPROVE

## Why
The security, code and play reviews all say `VERDICT: PASS` in round 1. There are no ux or ui reviews, which is correct here because the diff does not touch `src/ui/`, `src/text/`, `index.html` or any `.css` file. I ran `npm test` (375 passed) and `npm run build` (passed) in the worktree myself. Every acceptance criterion from AC1 to AC9 has a test that matches it. No balance numbers changed and no dependencies were added.

## For the human
What gets merged:
- `src/sim/jobConstants.ts` (new): a frozen `START_JOB_TARGETS` with the values 2, 2, 1, 1, 2. A comment explains how they come out of `RECIPES`.
- `src/sim/state.ts`: `createJobTargets` now returns a fresh copy of that constant.
- `tests/opening.test.ts` (new): scenario tests that use only `orderBuilding` and `tick`. They show that an opening on day 1 and one on day 2 both keep bread and water needs at 100 through day 20.
- Test updates for the new start values. The spec named three files, but the builder also updated `buildings.test.ts`, `formatBuildings.test.ts` and `formatResidents.test.ts`. No test was deleted. Where a test is about something other than staffing, it now sets explicit zero targets.

This is a gameplay change you will notice: in a new game, every finished work building gets workers right away.

Small follow-ups, none blocking:
- Two test fixtures still have a stale `/** */` comment sitting above the new one (`wellAndField` in `tests/assignment.test.ts` and `withFinishedWell` in `tests/formatResidents.test.ts`).
- The play review found that at 200% zoom on a 360 px phone, the "+" button of the wish number rows is cut off. That problem already existed before this job.
