# Build: 009-admin-ui-layout

## Round 1
- What changed:
  - `src/ui/app.ts`: `renderApp` now builds `<header class="page-header">` (h1 + clock panel) and `<main class="areas">` with Lager, Bewohner, Gebäude sections; shared `buildArea` helper (section + h2 + `aria-labelledby` + `dl.value-list`), new `buildSummaryView`/`updateSummaryView`; `root.replaceChildren(header, main)`. Tagline removed.
  - `src/ui/formatSummary.ts` (new): pure `formatResidentSummary(state)` and `formatBuildingSummary(state)` returning `{ label, value }[]`.
  - `src/ui/styles.css`: shared `.panel` class (border/radius/padding/background defined once), `--page-max-width: 72rem` custom property, single `@media (min-width: 48rem)` switching `.areas` to `repeat(auto-fit, minmax(min(18rem, 100%), 1fr))`; `.storage-values` renamed to neutral `.value-list` with `minmax(min(8rem, 100%), 1fr)` so it fits at 200 % text; `.clock-speeds` may wrap at large text sizes.
  - `src/text/de.ts`: added `residents: { heading, countLabel }`, `buildings: { heading, finishedLabel, underConstructionLabel }`; removed unused `tagline`.
  - `tests/formatSummary.test.ts` (new): formatter and text tests, seed 42.
- AC1: met by `src/ui/app.ts` `renderApp` (header with h1 + clock section, then main; tagline removed from `de.ts`).
- AC2: met by `src/ui/app.ts` `buildArea` and append order in `renderApp` (ids `storage-heading`, `residents-heading`, `buildings-heading`).
- AC3: storage view content unchanged (`buildStorageView`/`updateStorageView` still use `GOODS` and `formatStorage`); existing `tests/formatStorage.test.ts` passes.
- AC4: `formatResidentSummary` test "shows 8 residents right after load"; rendered via `buildSummaryView`.
- AC5: `formatBuildingSummary` test "shows the two finished start houses and nothing under construction".
- AC6: `tests/formatSummary.test.ts`: initial state, ordered field "Im Bau 1" (also after 11 ticks), after 12 ticks "Fertig 3"/"Im Bau 0", plus a no-mutation test.
- AC7: all views built once in `renderApp`; `updateSummaryView` only sets `textContent` of stored `dd` elements; clock update unchanged.
- AC8: clock code (`buildClockView`, `updateClockView`, handlers) unchanged apart from the `panel` class; `tests/formatClock.test.ts` and `tests/clock.test.ts` pass.
- AC9: no `aria-live`, no `innerHTML`, no state writes; `src/sim/` untouched (`git diff main --stat` shows no sim files).
- AC10: one-column `.areas` grid below 48rem; header is a wrapping flex row; buttons keep `min-width/min-height: 44px` and pause `min-width: 6.5rem`; `min-width: 0` on panels and `minmax(0, 1fr)` column stop overflow.
- AC11: single `@media (min-width: 48rem)` rule and `--page-max-width: 72rem` in `styles.css`; header and main share the same max width, so the header spans the content width.
- AC12: `.panel` class used by clock and all three areas; colors, focus outline and tabular digits unchanged.
- AC13: `min(8rem, 100%)` / `min(18rem, 100%)` column minimums, wrapping speed group, and `overflow-wrap: break-word` keep content inside 360 px at 200 % text.
- AC14: `de.residents` and `de.buildings`; tested in "German area texts".
- AC15: `npm test` and `npm run build` pass; no dependency changes; no DOM test library.
- Test run: `npm test`, 279 tests, all passing; `npm run build` OK.
- Note: I could not check the layout in a browser. Headless Firefox did not produce screenshots, and port 8765 was already taken by another process serving `factory/`, which I left running. AC10, AC11 and AC13 were checked by reading the CSS only.
