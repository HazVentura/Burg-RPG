APPROVE

## Why
All five reviewers (security, ux, ui, code, play) say `VERDICT: PASS` in round 1 and list only minor findings. I ran the checks myself in the worktree: `npm test` passes all 408 tests in 22 files, and `npm run build` passes. The diff matches the spec. The worker-hour loop is shared through `runWorkerHours`, `tests/production.test.ts` is unchanged, `package.json` is untouched, the UI adds no innerHTML or live regions, styles.css still has one media query, and every color it uses was already in the stylesheet on main.

## For the human
What gets merged is a new "Produktionskette" panel right after Lager. It lists each job with its input goods, worker count and output goods, then a final row for the residents. Missing goods carry a visible "fehlt", and a line at the top names the Engpass. New pure sim modules: `src/sim/shortages.ts` (`findShortages`) and `src/sim/productionChain.ts` (`getProductionChain`). `produceHour` now wraps the shared `runWorkerHours`. `needs.ts` exports `CONSUMED_GOODS` and `RATION_PER_DAY`. No data format changes, so the merge is easy to undo.

Optional follow-ups from the reviews:
- Add a soft hyphen to the heading. At 200 % zoom it breaks mid-word as "Produktions / kette".
- Mark the bottleneck good for screen readers. Today only the "Engpass" line names it.
- When no bakery exists, the line just says "Engpass: Brot" without a cause. The spec puts cause naming out of scope.
