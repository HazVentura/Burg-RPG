# Grundlayout der Verwaltungsoberfläche (admin UI layout)

## Goal
The page becomes the frame of the management interface. A header holds the title, the game clock and its controls. Below it are three labelled areas: Lager, Bewohner and Gebäude. The frame works from phone width up and uses the extra room on wider screens. The next jobs ("Bewohnerliste", "Gebäude-Panel", "Chronik", "Produktionsketten-Diagramm") fill these areas instead of each one inventing its own page structure.

Rules from `docs/vision.md`:
- Section 2: "Darstellung | Verwaltungsoberfläche (Panels, Tabellen, Kettendiagramm)"
- Section 2 / 4: "Echtzeit mit Ticks, Pause und Tempo (1x, 2x, 4x)"
- Section 3: "Oberfläche liest den Zustand und schickt Befehle ..., ändert den Zustand aber nie direkt."
- Section 11, step 3: "Verwaltungsoberfläche (Bewohnerliste, Lager, Berufe zuteilen)"

What exists today (`src/ui/app.ts`, `src/ui/styles.css`): `renderApp` builds a single `<main>` (max-width 40rem). It holds an `<h1>`, a tagline `<p>`, the clock `<section class="clock">` (date, season and time in a `<dl>`, a pause button and a speed group) and the storage `<section class="storage">`. Everything is built once, and `refresh` only updates `textContent` and `aria-pressed`. Jobs 002 and 003 set the rules this job must keep: 360 px without horizontal scrolling, 44 × 44 px buttons, no `aria-live`, focus kept while time runs.

## Acceptance criteria

### Page structure
- AC1: The page has a `<header>` element directly inside `#app`, followed by a `<main>` element. The header is not inside `<main>`. The header contains the `<h1>` "Burg-RPG" (`de.title`) and the existing clock section: date, season and time with their labels, the pause/resume button and the speed group "Tempo" with 1x/2x/4x. The tagline is no longer shown. Either remove `de.tagline` or leave it unused, but do not move it into `<main>`.
- AC2: `<main>` contains exactly three area sections, in this DOM order: Lager, Bewohner, Gebäude. Each is a `<section>` with a visible `<h2>` heading and `aria-labelledby` pointing at that heading's id. The headings are "Lager" (existing `de.storage.heading`), "Bewohner" and "Gebäude". The heading levels are h1 in the header, then h2 per area, with no levels skipped.
- AC3: The Lager area is the existing storage panel from job 003, unchanged in content and behavior. It lists all eight goods in `GOODS` order with their German names and rounded-down amounts (`formatStorage`).
- AC4: The Bewohner area shows the number of residents, as a `<dl>` pair with the label "Anzahl" and the value `state.residents.length`. Right after load that is "8" (vision section 10: 4 Paare).
- AC5: The Gebäude area shows two `<dl>` pairs. "Fertig" is the number of buildings with `hoursLeft === 0` (`isFinished`), and "Im Bau" is the number with `hoursLeft > 0`. Houses count as buildings. Right after load it shows "Fertig 2" and "Im Bau 0" (`START_HOUSES`).
- AC6: The values from AC4 and AC5 come from pure, DOM-free formatting functions in `src/ui/`, for example `formatResidentSummary(state)` and `formatBuildingSummary(state)`. They return label/value display strings, like `formatStorage` does. Unit tests cover the initial state, a state with an ordered building that is still under construction, and the same state after the building is finished (enough ticks). Use a fixed seed.

### Behavior kept from jobs 002 and 003
- AC7: All areas and the header are built once. On every `refresh` (after ticks and after button clicks), only the `textContent` of value elements and the `aria-pressed` of speed buttons change. No element is replaced or rebuilt. So a focused pause or speed button keeps keyboard focus while time runs (job 002, AC16), and the new Bewohner and Gebäude values follow the state without a reload.
- AC8: The clock behaves exactly as before. The pause button shows "Pause"/"Weiter" and toggles. The speed buttons set the speed and mark the active one with `aria-pressed="true"` and a visual style that is not only color. Changing the speed while paused stays paused. Right after load the clock shows `Tag 1, Jahr 1`, `Frühling`, `00:00 Uhr`.
- AC9: No new `aria-live` regions. Values are set with `textContent`, never `innerHTML`. The UI does not write to any field of `GameState`. `src/sim/` does not change.

### Responsive layout (checked by reading `src/ui/styles.css` and with `npm run dev` in the browser's device mode)
- AC10: At a 360 px wide viewport, nothing scrolls horizontally, either in the header or in any area. The header content wraps: title, clock values and controls may each take their own line. All buttons stay at least 44 × 44 CSS px. The three areas are stacked in one column, in the order Lager, Bewohner, Gebäude.
- AC11: From a viewport width of 48rem (768 px at default font size) upward, the areas sit in a CSS grid with more than one column. The page width limit grows beyond today's 40rem (for example to 72rem), so a desktop window does not show one narrow column. The header spans the full content width above the areas. The breakpoint and max width are set once each in `styles.css`, as a custom property or a single media query, not repeated per panel.
- AC12: All four boxes (clock and the three areas) share one panel style: the border, radius, padding and background from today's `.clock`/`.storage` rules (`#8a7a62` border, `0.5rem` radius, `#fffaf0` background). The style is defined once, for example a `.panel` class, not copied per section. The existing colors, focus outline (`3px solid #2457a6`) and tabular digits stay.
- AC13: The layout still works when the browser text size is doubled (200 % zoom) at 360 px. Content wraps instead of being clipped or overlapping, and nothing scrolls horizontally.

### Text, tests, build
- AC14: Every new player-facing string lives in `src/text/de.ts`: "Bewohner", "Anzahl", "Gebäude", "Fertig" and "Im Bau", grouped like the existing `storage` entry (for example `residents: { heading, countLabel }` and `buildings: { heading, finishedLabel, underConstructionLabel }`).
- AC15: `npm test` and `npm run build` pass. Existing tests are not deleted. `package.json` gets no new dependencies. No DOM test library is added.

## Out of scope
- The resident list itself (names, age, job, need bars), job controls and wish numbers. These come in the next job, "Bewohnerliste".
- Ordering buildings, build progress, workplace occupancy and costs. These come in the job "Gebäude-Panel".
- Areas for the Chronik and the production chain diagram. Those jobs add their own areas into this grid.
- A sticky or fixed header, tabs, a menu or in-page navigation between the areas, and collapsing areas.
- A dark mode, a theme switch, icons, images, fonts or a new color palette.
- A 2D map (vision: "Später").
- Save, load, new game or seed selection controls in the header (step 7).
- Showing the castle level in the header (step 6).

## Notes for the builder
- Files likely touched: `src/ui/app.ts` (header/main split, two new area views with update functions), `src/ui/styles.css` (shared panel class, grid and media query, larger max width), `src/text/de.ts`, new `src/ui/formatResidents.ts` / `src/ui/formatBuildings.ts` (or a single `formatSummary.ts`), new tests in `tests/` next to `tests/formatStorage.test.ts`.
- Follow the existing pattern: a `build...View()` that returns the section plus the value elements, and an `update...View(view, state)` called from `refresh`. Reuse `addValue` for the `<dl>` pairs. The storage `<dl>` grid (`.storage-values`) can serve the two new areas as well. If you share it, give it a neutral name.
- `renderApp` today does `root.replaceChildren(main)`. Change it to `root.replaceChildren(header, main)`. Keep `index.html` as is: `lang="de"` and the viewport meta are already there.
- In the header on a phone, keep the pause button's fixed min-width (6.5rem) so "Pause"/"Weiter" does not shift the speed buttons. The header should stay compact, because it pushes the areas down.
- With only three areas, a two-column grid at 48rem leaves Gebäude alone in the second row. That is fine. `repeat(auto-fit, minmax(…, 1fr))` or a fixed two-/three-column grid both meet AC11. The Bewohner area will become the widest one later, so do not lock column widths to today's small content.
- For the AC6 tests, order a building through the existing `orderBuilding` command, for example a field (12 build hours). Check "Im Bau 1", then tick 12 times and check "Fertig 3" and "Im Bau 0".
- Edge cases: the counts are shown as plain integers. Zero ("Im Bau 0") must still be shown, not hidden.
- Assumptions to confirm with the orchestrator:
  - The tagline is dropped to keep the phone header short.
  - The placeholder content of the Bewohner and Gebäude areas is a count (AC4, AC5), not an empty box or a "coming soon" text.
  - The 48rem breakpoint and roughly 72rem max width. Each is a one-line change.
