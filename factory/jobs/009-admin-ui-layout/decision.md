ESCALATE

## Why
All four round-1 reviews say `VERDICT: PASS`. I re-ran `npm test` (279 passed) and `npm run build` in `.worktrees/009-admin-ui-layout`; both pass. The diff stays inside the spec: five files, no `src/sim/` changes, no new dependencies. The spec says AC10, AC11 and AC13 (360 px with no horizontal scroll, more than one column from 48rem, 200 % text at 360 px) must be checked by reading `styles.css` and in the browser's device mode. Nobody did the browser check. The builder's headless Firefox produced no screenshots, my attempt failed the same way, and three reviewers asked for a human device-mode check before merge.

## For the human
Run `npm run dev` in `.worktrees/009-admin-ui-layout` and open device mode:
- At 360 px: there is no horizontal scroll. The header wraps (title, clock values, pause and speed buttons), and Lager, Bewohner and Gebäude are stacked in that order.
- At 360 px with text size at 200 %: content wraps and is not clipped or overlapping, there is still no horizontal scroll, and buttons are at least 44 px.
- At 768 px and on a desktop window: the areas sit in two or more columns, the page width grows to about 72rem, and the header spans the full width above the areas.

Question: does the layout behave this way? If yes, merge `factory/009-admin-ui-layout` as is. Everything else is verified.

What would be merged: a `<header>` (h1 plus the unchanged clock panel) and a `<main>` with three `aria-labelledby` areas: Lager (unchanged), Bewohner ("Anzahl 8") and Gebäude ("Fertig 2 / Im Bau 0"). The values come from new pure formatters in `src/ui/formatSummary.ts`, with tests at seed 42. There is one shared `.panel` style, a single 48rem media query and a `--page-max-width: 72rem` custom property. `.storage-values` is renamed to `.value-list`, and the unused `de.tagline` is removed. Minor reviewer notes, not blocking: the h2 size is close to the clock values, and `updateSummaryView` silently skips missing rows.
