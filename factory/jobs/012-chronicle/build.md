# Build: 012-chronicle

## Round 1
- What changed:
  - `src/sim/chronicle.ts` (new): `ChronicleEntry` union (`buildingFinished`, `goodRanOut`), `detectEvents(start, end, hour)` compares the start and end of a tick, `prependEntries` puts new entries in front and applies the cap (returns the same array when nothing is new).
  - `src/sim/chronicleConstants.ts` (new): `CHRONICLE_MAX_ENTRIES = 50`.
  - `src/sim/state.ts`: new keys `chronicle: []` and `nextChronicleId: 0` (running counter, as the spec notes suggest, for stable UI keys). `tick` now runs the old steps in `advanceHour`, then records events at the new hour. The doc comment lists step 5.
  - `src/sim/calendar.ts`: `getCalendarAt(hours)`. `getCalendar(state)` delegates to it and behaves the same as before.
  - `src/text/de.ts`: `de.chronicle` (heading "Chronik", list label, empty text "Noch keine Ereignisse.", `messages: Record<ChronicleKind, string>`).
  - `src/ui/formatBuildings.ts`: extracted `buildingDisplayNames(buildings)`. `formatBuildingList` uses it and its output is unchanged.
  - `src/ui/formatChronicle.ts` (new): `formatChronicle(state)` gives rows `{ key, text, timeText }`. The key is the entry's running number (`nextChronicleId - 1 - index`). `formatChronicleTime(hour)` gives "Tag 2, Jahr 1, Frühling, 00:00 Uhr".
  - `src/ui/app.ts`: fourth area "Chronik" after Gebäude. `buildArea` is split into `buildPanel` + value list. The area has an `<ol>` with `aria-label` and `tabindex="0"`, and items are keyed by row key: new keys are inserted at the top, dropped keys are removed, and existing items are never rebuilt. The empty text shows while the chronicle is empty, and the list is hidden then. No live region.
  - `src/ui/styles.css`: Chronik styles. The list has max-height 20rem with vertical scroll, a focus outline, and time above the message so long text wraps. Existing colors and tabular digits are reused, and no new media query is added.
  - Tests: new `tests/chronicle.test.ts`, `tests/formatChronicle.test.ts`. Updated `tests/state.test.ts` (key list, 960-tick expected state, finite-number check), `tests/needs.test.ts` (initial key list), and the hand-made states in `tests/assignment.test.ts`, `tests/production.test.ts` and `tests/needs.test.ts` (new keys). No test deleted.
- AC1: `src/sim/chronicle.ts` defines the type. `tests/chronicle.test.ts` checks the entry shapes, and `src/sim/` has no DOM access, `Date.now()` or `Math.random()`.
- AC2: `src/sim/state.ts` (`createInitialState`). Test: "initial chronicle (AC2)".
- AC3: `detectEvents` in `src/sim/chronicle.ts`. Tests in the "buildingFinished (AC3)" block: a well at hour 24, nothing at hours 1–23, a house, a field and a well finishing in different ticks, starting houses ignored.
- AC4: tests in the "goodRanOut (AC4)" block: bread runs out once, no repeat while it stays at 0, a second entry after restocking, used up by production, refilled within the tick gives no entry, goods that start at 0 give no entry, a remainder above 0 gives no entry.
- AC5: tests in the "order within a tick (AC5)" block: well, mill, wheat, bread in one tick; newer tick in front; match by id.
- AC6: tests in the "cap (AC6)" block: 60 events → 50 entries, newest at index 0, oldest dropped.
- AC7: tests in the "purity and commands (AC7)" block: same array in a tick without events, no mutation, `orderBuilding` spending Holz to 0 adds nothing, `setJobTarget`/`setPinnedJob` add nothing. The existing 960-tick mutation test in `tests/state.test.ts` still passes.
- AC8: `src/text/de.ts` (`chronicleMessages` keyed by `ChronicleKind`). Test: "chronicle texts (AC8)".
- AC9: `src/ui/formatChronicle.ts` and `buildingDisplayNames`. Tests in `tests/formatChronicle.test.ts`: Brunnen 1 at Tag 2 00:00, Brunnen 2, Mehl, the 960-tick run, keys stable and unique across the cap, names match the building list, `getCalendarAt` matches `getCalendar`.
- AC10: all items are covered by the tests above. In `tests/state.test.ts` the 960-tick expected state now includes `chronicle: [bread@192, water@120]` and `nextChronicleId: 2`.
- AC11/AC12: `src/ui/app.ts` (`buildChronicleView`, `updateChronicleView`, `main.append`). It uses `textContent` only, has no `aria-live` or `role`, and the two `role="alert"` elements are unchanged. There is no DOM test library, so this was checked by reading the code.
- AC13: `src/ui/styles.css` "Chronik area" section. This was checked by reading the CSS only: no browser was available in the build environment, so the device-mode check is left for the playtester.
- AC14: `npm test` and `npm run build` pass. There are no new dependencies.
- Deviation to confirm: `GameState` has a second new key, `nextChronicleId` (the spec notes allow this). The initial-state and key-list tests include it.
- Test run: `npm test`, 363 tests in 19 files, all passing. `npm run build` passes.
