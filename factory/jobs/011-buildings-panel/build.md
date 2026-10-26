# Build: 011-buildings-panel

## Round 1
- What changed:
  - `src/sim/buildings.ts`: new `isBuildingType(value: unknown)` next to `BUILDING_TYPES`, same style as `isJob`.
  - `src/sim/commands.ts`: `orderBuilding` rejects non-building values with `unknownBuilding`; `OrderResult` gets that reason. Nothing else changed in `src/sim/`.
  - `src/text/de.ts`: `buildingTypes: Record<BuildingType, string>`, `OrderFailure` type taken from `OrderResult`, and a new `buildingPanel` group (list label, duration words, progress label, workplace/bed words, missing prefix, "Bauen", fact labels, "bauen" suffix, `orderErrors: Record<OrderFailure, string>`). Kept apart from `de.buildings` because `tests/formatSummary.test.ts` pins that object exactly (AC6, existing tests unchanged).
  - `src/ui/formatBuildings.ts` (new): `formatDuration`, `formatBuildOptions`, `formatBuildingList`; pure, reuses `formatOccupancy`.
  - `src/ui/app.ts`: Gebäude area gets a second `role="alert"`, a building list (`Map<id, view>`, append-only, progress part toggled by `hidden`), the "Bauen" group with one always-enabled button per type, and `runOrder` that reads `state` at click time and refreshes at once.
  - `src/ui/styles.css`: Gebäude styles reusing existing colors, card border and tabular digits; no new media query.
  - `tests/commands.test.ts`: `isBuildingType` and AC1 guard cases.
  - `tests/formatBuildings.test.ts` (new): AC2 to AC7 cases plus the edge cases from the notes.
- AC1: met by `tests/commands.test.ts` "building guard in orderBuilding (AC1)" and "isBuildingType"; `src/sim/commands.ts` guard at the top of `orderBuilding`.
- AC2: met by `src/text/de.ts` (`buildingTypes`, `orderErrors` keyed by `OrderFailure`); tests "German building names and order errors (AC2)".
- AC3: met by `formatDuration` in `src/ui/formatBuildings.ts`; test "formatDuration (AC3)" (all spec examples plus 25 and 72).
- AC4: met by `formatBuildOptions`; tests "formatBuildOptions (AC4)" (order, all affordable at start, Mühle "15 Holz, 8 Stein", Wohnhaus "20 Holz"/"4 Betten", missing texts "Es fehlen 5 Holz, 2 Stein", "Es fehlen 10 Holz", "Es fehlen 3 Stein", exact-edge affordability).
- AC5: met by `formatBuildingList`; tests "formatBuildingList (AC5)" (starting houses, well 0 % / "noch 1 Tag" → 50 % / "noch 12 Stunden" → "0 von 2 Plätzen besetzt", wish number 2 with a second well at "0 von 2", round-down never 100 %, occupancy right after the finishing tick, per-type numbering, no occupancy while under construction but workplaces shown).
- AC6: `formatBuildingSummary` untouched; existing `tests/formatSummary.test.ts` passes, plus "formatBuildingSummary stays as it is (AC6)".
- AC7: covered by the tests above, all with seed 42; "ordering until goods run out" covers the second-click `notEnoughGoods` case.
- AC8: `src/ui/app.ts` appends `orderError`, building list, build options after the summary rows in `renderApp`.
- AC9: `buildBuildingRow` / `updateBuildingListView` / `updateBuildingRow` in `src/ui/app.ts`: native `<progress max="100">` with `aria-label` "<Name>: Baufortschritt", percent and "noch …" as text, status line with occupancy or beds; items keyed by id, appended, updated in place.
- AC10: `buildBuildOptionsView` in `src/ui/app.ts`: `role="group"` labelled by the h3 "Bauen", per entry name, Kosten/Bauzeit/Bietet, missing text, button "<Name> bauen", never disabled.
- AC11: `runOrder` in `src/ui/app.ts`: on ok replaces state, clears the Gebäude alert and refreshes; on failure shows `de.buildingPanel.orderErrors[reason]` in the Gebäude alert only. The Bewohner `runCommand` still writes only its own alert.
- AC12: refresh only sets `textContent`, `progress.value`, `hidden` and appends new items; static entry texts are set once at build time; no `innerHTML`.
- AC13: `src/ui/styles.css` Gebäude section: `minmax(min(15rem, 100%), 1fr)` grids, wrapping flex rows, `max-width: 100%` wrapping build buttons, buttons get the existing 44 px minimum via `.area button`; still one `@media`. Not checked in a real browser in device mode (no browser available to the builder); please verify with `npm run dev`.
- AC14: `npm test` and `npm run build` pass; no tests deleted; no dependency changes; `src/sim/` changed only for AC1.
- Test run: `npm test`, 329 tests, all passing. `npm run build` passes.
- Note: the worktree has an untracked `node_modules` symlink to the repo root's `node_modules` so tests can run; it is not committed.
