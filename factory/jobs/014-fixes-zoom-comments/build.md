# Build: 014-fixes-zoom-comments

## Round 1
- What changed:
  - `src/ui/styles.css`: `.job-target-stepper` gets `flex-wrap: wrap`, `min-width: 0`, `max-width: 100%` and a why-comment; `.job-target-value` min-width becomes `min(4.5rem, 100%)`. At a narrow panel the stepper wraps instead of pushing "+" out.
  - `tests/assignment.test.ts`: removed the stale first doc comment over `wellAndField`; merged the still-correct ids/places into the remaining one.
  - `tests/formatResidents.test.ts`: removed the stale first doc comment over `withFinishedWell`.
- AC1: met by `src/ui/styles.css` (`/* Wish numbers */`, `.job-target-stepper`, `.job-target-value`). Checked in headless Firefox in a 180 px iframe (vite preview of the build): all five rows (Wasserträger, Bauer, Müller, Bäcker, Holzfäller) show name, occupancy, "–", "Wunsch N", "+" inside the panel; at 180 px the three parts stack vertically.
- AC2: same check measured `document.documentElement.scrollWidth` = 180 = viewport width at 180 px (and 168 = 168 with a scrollbar); no element inside a panel extended past the panel content edge.
- AC3: at a 360 px iframe all steppers measured "–" (44x44), value (73x22), "+" (44x44) on one line in that order; desktop is unchanged because the row fits and nothing wraps.
- AC4: buttons keep the shared `min-width/min-height: 44px` (measured 44x44 at both widths); flex-wrap keeps DOM order, so "–", value, "+" read top to bottom when wrapped. `src/ui/app.ts` untouched, so DOM order and aria-labels are unchanged.
- AC5: CSS-only change in `src/ui/styles.css`; still one media query (`48rem`, line 78); no new colors.
- AC6: `tests/assignment.test.ts` `wellAndField` has one doc comment: "A new game with a finished well (id 3, 2 places) and field (id 4, 4 places), but all wish numbers at 0, ...".
- AC7: `tests/formatResidents.test.ts` `withFinishedWell` has one doc comment: "A finished well after 24 ticks, with every wish number at 0, ...".
- AC8: no fixture bodies or test cases changed.
- Test run: `npm test`, 375 tests in 20 files, all passing; `npm run build` passes.
- Note (not changed, pre-existing): at 180 px, long words such as the "Wunschzahlen" heading and some resident names break mid-word due to the existing `overflow-wrap: break-word`; this prevents overflow and is outside this job's scope.
