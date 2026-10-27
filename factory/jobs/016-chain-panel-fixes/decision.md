APPROVE

## Why
All five reviewers (security, ux, ui, code, play) say `VERDICT: PASS` in round 1, and the diff does touch UI code, so it is right that all five ran. I ran `npm test` (424 passed, 22 files) and `npm run build` (OK) in `.worktrees/016-chain-panel-fixes` myself. The diff stays inside the files the spec lists: no dependency changes, no tests deleted (assertions were updated to the new strings), one media query and no new colors in `styles.css`. All the acceptance criteria are met.

## For the human
What gets merged:
- The heading "Produktions­kette" now has a soft hyphen. The play review confirmed it breaks as "Produktions-" / "kette" at 180 px.
- Every bottleneck good now has a visually hidden ", Engpass" mark, so a screen reader reads "Weizen 0 fehlt, Engpass". The mark is built once and switched on and off with `hidden`.
- A new pure function, `missingBuildingsFor`, in `src/sim/shortages.ts`.
- The bottleneck line now names the missing building, for example "Engpass: Brot (keine Bäckerei)". The cause texts come from a typed `Record<BuildingType, string>` in `de.ts`.

Small points you can ignore:
- The soft hyphen is written as the `­` escape, not as a literal character. The spec asked for a literal, but the escape is easier to see in an editor and the runtime string is identical.
- Nobody has checked the screen reader mark in a real browser, because no DOM test library is allowed. The code matches the standard clip pattern.
- The play review found two issues outside this job's scope that could become follow-up jobs: "Hildebrand" breaks mid-word at 180 px, and a bakery with no workers is not named in the bottleneck line.
