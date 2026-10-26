VERDICT: PASS

## Findings
- [minor] At 180 px the "Wunschzahlen" heading breaks mid-word ("Wunschzahle / n") and the Zuteilung select text is truncated ("Automa"). Evidence: play/zoom200-3.png. Fix: none needed here; pre-existing, listed as out of scope in the spec.
- [minor] At 180 px each wish row takes three lines ("–", "Wunsch N", "+" stacked), so the Bewohner panel gets long. Evidence: play/zoom200-3.png, zoom200-4.png. Fix: accepted trade-off of the wrap approach; order and 44 px targets hold.

## Played
No sim run: the diff touches only CSS and two test comments, no sim code. Built the worktree and served it with vite preview. Took screenshots at 360 px (phone-0..3), 180 px (zoom200-0..6) and 1280 px (desktop-0..2); I opened phone-2, zoom200-3, zoom200-4 and desktop-1. At 180 px all five wish rows show name, occupancy text, "–", "Wunsch N" and "+" fully inside the panel, in that order, with 44 px buttons and no clipping. At 360 px each row is one line: "–  Wunsch N  +". Gebäude at 180 px has no overflow. The diff matches AC5-AC8: CSS only, one media query, one doc comment each over wellAndField and withFinishedWell.

## Not checked
Real clicks on the buttons. Exact scrollWidth (taken from the builder's report, not measured by me). Desktop wish rows (desktop-1 shows only Gebäude and Chronik). Other tiles were not opened. I did not run npm test.
