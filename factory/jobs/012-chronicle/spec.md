# Chronik (messages from the simulation core, shown as a list)

## Goal
The simulation core records notable events as chronicle entries in the game state, and a new "Chronik" area in the UI lists them, newest first, each with its game date and time. In this job there are two kinds of event: a building is finished ("Mühle 1 fertig gebaut"), and a good runs out ("Mehl ist ausgegangen"). The player then notices shortages and finished buildings without watching every number. Later jobs (for example "Abwanderung … (Meldung in der Chronik)" in step 4 of `factory/backlog.md`) add more kinds of entry.

Rules from `docs/vision.md`:
- Section 3: "Simulationskern als reine Funktionen: `tick(state) → state`. Kein Zugriff auf DOM …" and "Oberfläche liest den Zustand und schickt Befehle …, ändert den Zustand aber nie direkt."
- Section 3: "Speichern: … Der Spielstand hat eine Versionsnummer." This means the chronicle has to be plain JSON data inside `GameState`.
- Section 2: "Oberfläche Deutsch, Code Englisch, Texte zentral gesammelt". The core therefore stores structured entries, never German sentences. The UI turns entries into text from `src/text/de.ts`.
- Section 4: "1 Tick = 1 Spielstunde."

What exists today:
- `tick(state)` in `src/sim/state.ts` does the following in order: `produceHour` on the buildings as they were at the start of the tick, `advanceConstruction`, `consumeDailyFood` when the new hour is 0, then `assignJobs`. Nothing records events yet.
- `GameState` has the keys `elapsedHours`, `rngState`, `storage`, `residents`, `nextResidentId`, `buildings`, `nextBuildingId` and `jobTargets`. `tests/state.test.ts` checks this exact key list, the full state after 960 ticks, and a JSON round trip.
- `formatBuildingList` in `src/ui/formatBuildings.ts` gives buildings display names such as "Mühle 1" (the type name plus a running number within that type, in list order). `formatClock(calendar)` in `src/ui/formatClock.ts` produces the date ("Tag 3, Jahr 1"), the season and the time ("14:00 Uhr"). `getCalendar(state)` reads only `state.elapsedHours`.
- `src/ui/app.ts` builds the page once. The areas are Lager, Bewohner and Gebäude, in that order, and `refresh` updates them in place.

## Acceptance criteria

### Simulation core
- AC1: A new module `src/sim/chronicle.ts` defines the type `ChronicleEntry` as a discriminated union of plain JSON data. Every entry has `hour`, which is the `elapsedHours` of the state the tick returns (the hour at which the event is visible). There are exactly two kinds:
  - `{ kind: "buildingFinished", hour, buildingId, buildingType }`
  - `{ kind: "goodRanOut", hour, good }`
  Entries contain no German text and no `Date`, and `src/sim/` stays free of DOM access, `Date.now()` and `Math.random()`.
- AC2: `GameState` gets a new key `chronicle: ChronicleEntry[]`, ordered newest first. `createInitialState(seed)` starts it as `[]`. Nothing else in the initial state changes.
- AC3: A building is finished in a tick when it had `hoursLeft > 0` at the start of the tick and `hoursLeft === 0` in the returned state. For each such building, `tick` adds one `buildingFinished` entry. This covers every building type, houses included. Buildings that were already finished at the start of the tick never produce an entry.
- AC4: A good ran out in a tick when its storage amount was `> 0` at the start of the tick and is exactly `0` in the state `tick` returns, after production and daily consumption. For each such good, `tick` adds one `goodRanOut` entry. A good that stays at 0 adds no further entries. It only adds a new entry after it has been above 0 at the start of a later tick and drops to 0 again. Goods that start the game at 0 (Weizen, Mehl, Eisenerz, Werkzeug) produce no entry until they have been in stock.
- AC5: Order within one tick is deterministic. All `buildingFinished` entries come first, in `state.buildings` order, followed by all `goodRanOut` entries in `GOODS` order. The new entries of a tick are put in front of the existing chronicle. Read from index 0, the chronicle therefore lists the newest tick first, and inside a tick it follows the AC5 order. (Example: if a well and a mill finish in the same tick in which bread runs out, the chronicle starts with well, mill, bread.)
- AC6: The chronicle is capped. A new constants module `src/sim/chronicleConstants.ts` exports `CHRONICLE_MAX_ENTRIES = 50`. After each tick, `tick` keeps only the newest `CHRONICLE_MAX_ENTRIES` entries and drops the oldest ones. A long game therefore never grows the state without limit.
- AC7: `tick` still never mutates its input. A tick with no events still returns a state in which `chronicle` is the same array as before or an equal copy, and existing behavior (storage, buildings, residents, job assignment) is unchanged. Player commands (`orderBuilding`, `setJobTarget`, `setPinnedJob`) add no chronicle entries, even when `orderBuilding` spends Holz or Stein down to 0.

### Texts and formatting (pure, DOM-free, unit-tested)
- AC8: `src/text/de.ts` gets every new string: the area heading "Chronik", a text for the empty chronicle (for example "Noch keine Ereignisse."), and the message wording. The message texts are keyed by `ChronicleEntry["kind"]`, so a new kind without a text is a type error. The wording:
  - `buildingFinished`: "<Anzeigename> fertig gebaut", for example "Mühle 1 fertig gebaut".
  - `goodRanOut`: "<Ware> ist ausgegangen", for example "Mehl ist ausgegangen", using the names in `de.goods`.
- AC9: A pure formatter, for example `formatChronicle(state)` in a new `src/ui/formatChronicle.ts`, returns one row per chronicle entry, in chronicle order (newest first). Each row has:
  - a stable `key` that is unique within the current chronicle, so the view can tell new rows from existing ones;
  - `text`, the message from AC8. For `buildingFinished`, the display name is the same one the building list shows for that `buildingId` ("Mühle 1"). Extract the naming from `formatBuildingList` into a shared helper rather than writing the numbering logic twice;
  - `timeText`, the game date and time of `hour` built from `formatClock`, for example "Tag 3, Jahr 1, Frühling, 14:00 Uhr" (exact punctuation is up to the builder, but it must include day, season, year and hour).
  To get the calendar for an hour that is not the current one, the builder may add a function such as `getCalendarAt(elapsedHours)` in `src/sim/calendar.ts`. `getCalendar(state)` must keep working unchanged.
- AC10: Unit tests with a fixed seed cover AC1 to AC9. They check:
  - the initial state has `chronicle: []`;
  - when a well is ordered on the initial state, the chronicle stays empty for 23 ticks. After the 24th tick there is exactly one `buildingFinished` entry with that well's id and `hour` 24, and `formatChronicle` shows "Brunnen 1 fertig gebaut" with the time for hour 24 (Tag 2, 00:00 Uhr);
  - a hand-made state whose bread runs out in the next daily consumption gets exactly one `goodRanOut` entry for bread in that tick, and none in the following ticks while bread stays at 0;
  - a good that goes from 0 back above 0 and then down to 0 again gets a second entry;
  - two buildings finishing in the same tick, plus a good running out in that tick, appear in the AC5 order;
  - after more than `CHRONICLE_MAX_ENTRIES` events the chronicle has exactly `CHRONICLE_MAX_ENTRIES` entries and the newest one is at index 0;
  - `orderBuilding` that spends Holz to 0 adds no entry;
  - the existing tests in `tests/state.test.ts` are updated for the new key: the key list includes `"chronicle"`, the expected 960-tick state includes the chronicle that run produces (water and bread each ran out once, at the hours the run reaches 0), and the JSON round trip still passes. No test is deleted.

### Chronik area
- AC11: `src/ui/app.ts` adds a fourth area "Chronik" after Gebäude, built with the existing `buildArea`/panel pattern (a `section` labelled by its own `h2`). It contains a list (`<ol>` or `<ul>`, with an accessible name) holding one item per AC9 row, newest at the top. Each item shows the time text and the message text. While the chronicle is empty, the area shows the empty text from AC8 instead.
- AC12: Rendering follows jobs 009 to 011. The page is built once. On `refresh`, items for new keys are added at the top, items whose keys left the chronicle (because of the AC6 cap) are removed, and existing items are not rebuilt. Text is set with `textContent`, never `innerHTML`. The chronicle is not a live region (no `aria-live`, no `role="log"`/`"alert"`), so ticks at 4x do not flood screen readers. The two existing `role="alert"` elements stay the only live regions.
- AC13: Layout (checked by reading `src/ui/styles.css` and with `npm run dev` in device mode). At 360 px viewport width, and also at 200 % text size, nothing scrolls horizontally, and long messages wrap inside the panel. The existing colors, panel style and tabular digits are reused, with no new palette. The breakpoint from job 009 stays the only media query. The list may get a maximum height with vertical scrolling inside the panel, so 50 entries do not stretch the page. If it does, the scroll container must be reachable by keyboard (for example with `tabindex="0"` and the list's accessible name).

### Tests and build
- AC14: `npm test` and `npm run build` pass. `package.json` gets no new dependencies, and no DOM test library is added.

## Out of scope
- Any other kind of event: residents without work, needs dropping, job changes, births, deaths, emigration and seasons. Each later job adds its own kinds.
- A "good is back in stock" message, and warnings before a good runs out (for example "nur noch 5 Brot").
- Detecting shortages that leave a remainder above 0. For example, 0.5 Wasser left that nobody can use because the daily ration is 1 does not count as "ausgegangen" under AC4. The rule is stock reaching exactly 0. A demand-based shortage rule can come with the production chain diagram (bottleneck job).
- Chronicle entries for player commands (orders, wish numbers, pins).
- Filtering, searching or grouping the chronicle, clicking an entry to jump to a building, and marking entries as read.
- Saving the chronicle to `localStorage` (step 7). Because it is part of `GameState`, it will be saved together with the state.
- Notifications, sounds, or pausing the game on an event.
- Changing balance numbers, recipes, build times or the order of steps in `tick`.

## Notes for the builder
- Files likely touched: the new `src/sim/chronicle.ts` (types, plus a pure helper that compares the start and end of a tick and returns the new entries), the new `src/sim/chronicleConstants.ts`, `src/sim/state.ts` (the `chronicle` key, `createInitialState`, recording in `tick`, and an updated doc comment on the tick order), possibly `src/sim/calendar.ts` (`getCalendarAt`), `src/text/de.ts`, the new `src/ui/formatChronicle.ts`, `src/ui/formatBuildings.ts` (extract the display-name helper and keep `formatBuildingList` output identical), `src/ui/app.ts`, `src/ui/styles.css`, the new `tests/chronicle.test.ts` and `tests/formatChronicle.test.ts`, and updates in `tests/state.test.ts`.
- Keep `tick` readable. Compute the normal next state the same way as today, then compare `state` (start) with that result to find finished buildings and goods that ran out, and prepend the entries. Buildings keep their ids and are never removed, so match them by id. The hour of every new entry is the new `elapsedHours`.
- Storage amounts are multiples of 1/8 (see `productionConstants.ts`), so a strict `=== 0` comparison is exact. Do not add an epsilon.
- A row key for AC9 can come from the entry's position counted from the oldest end plus its hour and kind, or from a running counter kept in state (`nextChronicleId`). Pick one that stays stable when the cap drops old entries. A counter in state is the simplest. If you add it, extend the AC2 initial state and the key-list test to include it.
- A building that finishes in a tick is staffed by `assignJobs` in the same tick (job 007/008 order). This job does not change that. Only the entry is new.
- Edge cases to test: a field (12 hours) and a well (24 hours) ordered at the same time finish in different ticks, giving separate entries; a good reaching 0 during production but refilled later in the same tick gives no entry (only the start and end of the tick count); the cap keeps the newest entries, not the oldest; the second "Brunnen" gets "Brunnen 2" in its message.
- Assumptions for the orchestrator to confirm: "ausgegangen" means the stock reaches exactly 0 (AC4); the cap is 50 entries; the chronicle is not a live region; messages show the numbered display name ("Mühle 1"), not only the type name.
