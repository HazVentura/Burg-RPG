# Korrekturen: Wunschzahl-Knöpfe bei 200 % Zoom, doppelte Test-Kommentare

## Goal
At 200 % zoom on a 360 px phone (an effective 180 px wide viewport) the player can reach and press both the "–" and the "+" button of every wish number row, so wish numbers can be raised again. Two stale duplicate doc comments over test fixtures are removed, so each fixture is described once and correctly.

Background: the play review of job 013 found the "+" button cut off at the right edge (`factory/jobs/013-playable-start/round-1/review-play.md`, screenshot `factory/jobs/013-playable-start/round-1/play/zoom200-3.png`, rows Wasserträger and Bauer). The cause is in `src/ui/styles.css`: `.job-target-stepper` is a flex row without `flex-wrap`, holding two buttons of at least 44 px plus `.job-target-value` with `min-width: 4.5rem`. At a 180 px viewport the content box of the Bewohner panel is only about 114 px wide (page padding 2 × 1rem, panel padding 2 × 1rem, borders), so the three parts cannot fit in one row.

## Acceptance criteria
- AC1: At a 180 px wide viewport (equivalent to 360 px at 200 % zoom), every wish number row in the Bewohner area shows its job name, its occupancy text ("x von y Plätzen besetzt"), the "Wunsch" label with its number, the "–" button and the "+" button completely inside the panel. Nothing is clipped at the right edge and nothing overlaps.
- AC2: At a 180 px wide viewport, with the page scrolled through from top to bottom (header, Lager, Bewohner including resident cards and wish numbers, Gebäude, Chronik), the page has no horizontal overflow: `document.documentElement.scrollWidth` is not larger than the viewport width, and no element is cut off at the right edge of its panel.
- AC3: At 360 px viewport width (100 % zoom) and on a desktop width (at least 48rem), each wish number row looks as before this job: "–", "Wunsch N" and "+" sit in one row next to each other, in this order.
- AC4: At every width, both wish number buttons stay at least 44 × 44 CSS px, and the visual order stays "–", then the wish number, then "+" (reading left to right, or top to bottom where the row wraps). The DOM order and the `aria-label`s of the buttons ("<Beruf>: …" from `de.jobTargets`) are unchanged.
- AC5: The fix uses only CSS in `src/ui/styles.css` (no change to `src/ui/app.ts` is required; if the builder still changes it, the behaviour and accessible names in AC4 must stay the same). The breakpoint from job 009 (`48rem`) stays the only media query. The existing colors, focus outline (`3px solid #2457a6`), tabular digits and panel style are reused, with no new palette.
- AC6: In `tests/assignment.test.ts`, the fixture `wellAndField` has exactly one doc comment. The stale line `/** The seed-42 game with a finished well (id 3, 2 places) and field (id 4, 4 places). */` is removed as a separate comment. The remaining comment states that all wish numbers are 0; it may keep the still-correct facts about building ids and places (well id 3 with 2 places, field id 4 with 4 places) merged into that one comment.
- AC7: In `tests/formatResidents.test.ts`, the fixture `withFinishedWell` has exactly one doc comment. The stale line `/** The seeded start with one well ordered and its 24 build hours passed. */` is removed as a separate comment. The remaining comment states that the well is finished after 24 ticks and every wish number is 0.
- AC8: No test logic changes: the fixture bodies and all test cases stay as they are, and `npm test` and `npm run build` pass.

## Out of scope
- Any change to game rules, simulation code (`src/sim/`), start values or texts in `src/text/de.ts`.
- Redesigning the wish number controls (for example replacing the stepper with an input field or select).
- Shortening or hiding the "Wunsch" label, or changing its wording.
- The truncated text inside the "Zuteilung" select at 180 px (for example "Automa…" in the screenshot). The select stays within the card and remains usable; native select text truncation is accepted.
- Automated layout tests in a browser (the project has no DOM test setup); the layout criteria are checked by reading the CSS and by the play review.
- Other comment cleanups in tests or source beyond the two fixtures named.

## Notes for the builder
- Files: `src/ui/styles.css` (section `/* Wish numbers */`: `.job-target`, `.job-target-stepper`, `.job-target-value`), `tests/assignment.test.ts` (lines around 66-67), `tests/formatResidents.test.ts` (lines around 22-23).
- Stepper DOM (`buildJobTargetView` in `src/ui/app.ts`): `div.job-target-stepper` contains `button` "–", `span.job-target-value` ("Wunsch" + number), `button` "+". The row `li.job-target` already has `flex-wrap: wrap`, so the stepper moves under the text; the stepper itself is what overflows.
- Width budget at 180 px: about 114 px of panel content. Two 44 px buttons plus the 0.375rem gap (about 94 px) fit in one line; the 4.5rem (72 px) value block does not fit between them. Possible approaches that keep AC3 and AC4: let the stepper wrap (`flex-wrap: wrap`, `max-width: 100%`, `min-width: 0`), or lay it out as a small grid where the value takes its own line above or between the buttons only when space runs out, or reduce `min-width` of `.job-target-value` with `min()` (the pattern already used elsewhere, e.g. `minmax(min(15rem, 100%), 1fr)`). Pick one; do not add a second media query. Make sure that after wrapping, "–" does not end up alone on one line with "Wunsch N +" on the next in a way that reverses the reading order; "–" before value before "+" must hold.
- Keep the comment in `styles.css` header ("fits a 360 px viewport, also at 200 % text size") true; a short comment on the stepper explaining why it wraps is welcome (comment the why).
- Check with `npm run dev` in device mode at 180 px width and at 360 px width, and on a desktop width. Check all five wish number rows (Wasserträger, Bauer, Müller, Bäcker, Holzfäller) and also that resident cards, Lager, Gebäude and Chronik have no horizontal overflow at 180 px (AC2). If another element overflows at 180 px, fix it in the same CSS-only way.
- Comment fixes: delete only the stale line in each pair; do not touch the function bodies.
