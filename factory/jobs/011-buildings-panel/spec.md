# Gebäude-Panel (order buildings, construction progress, workplace occupancy)

## Goal
The Gebäude area changes from two counts into a working panel. The player can order every building type and sees its cost in Holz and Stein and its build time before ordering. The panel lists every building with its construction progress, and for finished work buildings it shows how many of their workplaces are taken. This completes the first playable version (vision section 11, step 3): from now on, wish numbers and pins from job 010 actually put residents to work in the browser. The job adds no new simulation rules.

Rules from `docs/vision.md`:
- Section 6: "Jeder Beruf braucht ein Arbeitsgebäude mit einer festen Zahl an Arbeitsplätzen." / "Wohnhäuser bieten Betten." / "Bauen kostet Holz und Stein und dauert eine feste Zeit. Gebaut wird automatisch, es gibt keinen eigenen Baumeister."
- Section 3: "Oberfläche liest den Zustand und schickt Befehle …, ändert den Zustand aber nie direkt."
- Section 4: "1 Tick = 1 Spielstunde." A game day has 24 hours.
- Section 5: the building names Brunnen, Feld, Mühle, Bäckerei, Holzfällerhütte, plus Wohnhaus from section 6.

What exists today:
- `src/sim/commands.ts` has `orderBuilding(state, type)`. It pays the full cost at once and returns `{ ok: true, state }` or `{ ok: false, reason: "notEnoughGoods" }`. It does not check `type` at runtime.
- `src/sim/buildings.ts` has `BUILDING_TYPES` (house, well, field, mill, bakery, woodcutterHut), `Building { id, type, hoursLeft }` and `isFinished`. `src/sim/buildingConstants.ts` has `getBuildingDefinition(type)`, which returns `cost {wood, stone}`, `buildHours`, `workplaces` and `beds`.
- `JOB_BUILDING` / `jobForBuilding` in `src/sim/jobs.ts` link buildings to jobs. A resident works in the building whose id is in `Resident.workplaceId`.
- `src/ui/app.ts` shows the Gebäude area through `buildSummaryView` with the rows "Fertig" and "Im Bau" (`formatBuildingSummary`). The Bewohner area already has a `role="alert"` element and a `runCommand` helper for job commands. `formatOccupancy(working, places)` in `src/ui/formatResidents.ts` produces "<n> von <m> Plätzen besetzt".
- The game starts with 2 finished houses, 50 Holz and 20 Stein, and with no work buildings.

## Acceptance criteria

### Simulation guard
- AC1: `orderBuilding` checks at runtime that `type` is one of `BUILDING_TYPES`, for example with a new `isBuildingType(value: unknown)` next to `BUILDING_TYPES`, in the same style as `isJob`. Any other value returns `{ ok: false, reason: "unknownBuilding" }` and changes nothing. Everything else `orderBuilding` does stays as it is, and the existing tests pass unchanged.

### Texts
- AC2: `src/text/de.ts` gets a German name for every building type, keyed by `BuildingType` (`Record<BuildingType, string>`, so a missing type is a type error): Wohnhaus, Brunnen, Feld, Mühle, Bäckerei, Holzfällerhütte. It also gets every other new string from this job, including one error text per `orderBuilding` failure reason (`notEnoughGoods`, `unknownBuilding`). Those error texts are keyed by the reason type taken from `OrderResult`, so a new reason without a text is a type error.

### Formatting (pure, DOM-free, unit-tested)
- AC3: A pure `formatDuration(hours)` turns whole game hours into German text: days (24 hours each) and the remaining hours, with parts that are 0 left out, and singular and plural forms. Examples: 1 → "1 Stunde", 12 → "12 Stunden", 24 → "1 Tag", 48 → "2 Tage", 30 → "1 Tag 6 Stunden", 0 → "0 Stunden".
- AC4: A pure formatter, for example `formatBuildOptions(state)`, returns one row per building type in `BUILDING_TYPES` order. Each row has:
  - the `type` and its German name;
  - the cost as text, for example "20 Holz" or "15 Holz, 8 Stein". A cost part of 0 is left out, using the good names from `de.goods`;
  - the build time as text (`formatDuration(buildHours)`);
  - what the building offers, as text: "<n> Arbeitsplätze (<Beruf>)" for a work building ("1 Arbeitsplatz" in the singular) and "<n> Betten" for a house;
  - `affordable`: true when `storage.wood >= cost.wood` and `storage.stone >= cost.stone`;
  - when it is not affordable, a text for what is missing, for example "Es fehlen 5 Holz" or "Es fehlen 3 Holz, 2 Stein"; otherwise null.
- AC5: A pure formatter, for example `formatBuildingList(state)`, returns one row per building in `state.buildings` order. Each row has:
  - the `id`;
  - a display name made of the German type name plus a running number within that type, in list order: "Wohnhaus 1", "Wohnhaus 2", "Brunnen 1". Buildings are never removed, so the number of a building never changes;
  - `finished` (from `isFinished`);
  - for a building under construction: the progress as a whole percent, `floor((buildHours - hoursLeft) / buildHours * 100)`, and the remaining time as text, "noch <formatDuration(hoursLeft)>";
  - for a finished work building: the residents whose `workplaceId` equals the building id, the building's `workplaces`, and the text from the existing `formatOccupancy(working, places)`;
  - for a finished house: "<n> Betten" (no occupancy, since beds are not assigned yet);
  - for a work building under construction: its number of workplaces, so the player sees what is coming. It must not show an occupancy, because `assignJobs` never staffs unfinished buildings.
- AC6: The existing `formatBuildingSummary` ("Fertig", "Im Bau") stays unchanged, and its tests still pass.
- AC7: Unit tests with a fixed seed cover AC1 to AC5. They check:
  - the initial state: six build options in `BUILDING_TYPES` order, all affordable against 50 Holz and 20 Stein (Mühle shows "15 Holz, 8 Stein", Wohnhaus shows "20 Holz" and "4 Betten"), and a list of "Wohnhaus 1", "Wohnhaus 2", both finished with "4 Betten";
  - a well that has just been ordered shows 0 % and "noch 1 Tag"; after 12 ticks it shows 50 % and "noch 12 Stunden"; after 24 ticks it is finished with "0 von 2 Plätzen besetzt";
  - with the waterCarrier wish number at 2 after the well is finished: "2 von 2 Plätzen besetzt" on that well, and a second finished well shows "0 von 2 Plätzen besetzt";
  - a hand-made storage that is too small: `affordable` is false, and the missing text names exactly the missing goods and amounts;
  - `orderBuilding` with a string that is not a building type returns `unknownBuilding` and leaves the state as it is;
  - the `formatDuration` examples from AC3.

### Gebäude area
- AC8: The Gebäude area keeps its heading "Gebäude" and the "Fertig"/"Im Bau" rows. Below them, in this order, come: an error message element (AC11), the list of buildings (AC9), and a group "Bauen" with the build options (AC10).
- AC9: The building list is a `<ul>` with one `<li>` per building (AC5 rows). Each item shows the display name and its state:
  - under construction: a native `<progress max="100">` (or an element with `role="progressbar"` and `aria-valuenow`/`aria-valuemin`/`aria-valuemax`). Its accessible name contains the building name. The percent and the remaining time are also shown as text, so the bar does not depend on color;
  - finished work building: the occupancy text;
  - finished house: the beds text.
  Items are keyed by building id. A new building is appended at the end, and existing items are updated in place and never rebuilt.
- AC10: The group "Bauen" (a heading or `<fieldset>`/`<legend>`) has one entry per AC4 row. Each entry shows the name, cost, build time, what the building offers, and the missing text when it applies. It also has a button whose visible text or accessible name contains the building name, for example "Brunnen bauen". Clicking it calls `orderBuilding(state, type)` with the current state. The button stays enabled when the player cannot afford the building, so focus is never lost when stock drops during a tick. Being unaffordable is shown through the missing text, and a click then fails with `notEnoughGoods` (AC11).
- AC11: After a successful order, the UI replaces its state with `result.state` and calls `refresh` at once, even while paused. The new building then appears in the list, "Im Bau" goes up and the Lager shows the reduced Holz and Stein. On `ok: false`, the state is not replaced, and the German text for the reason appears in a `role="alert"` element inside the Gebäude area. The next successful order clears it. This alert and the one in the Bewohner area are the only live regions. Each area reports only the errors of its own commands.
- AC12: Rendering follows job 009/010: the page is built once, and `refresh` changes only `textContent`, progress values, `hidden`/`disabled` (if used), and adds list items for new building ids. So a focused "bauen" button keeps keyboard focus while time runs and after a click. Text is set with `textContent`, never `innerHTML`.

### Layout (checked by reading `src/ui/styles.css` and with `npm run dev` in device mode)
- AC13: At 360 px viewport width, and also at 200 % text size, nothing scrolls horizontally. Building items and build options wrap within the panel. Every button is at least 44 × 44 CSS px. The existing colors, panel style, focus outline and tabular digits are reused, with no new palette. The breakpoint from job 009 stays the only media query.

### Tests and build
- AC14: `npm test` and `npm run build` pass. No existing test is deleted. `package.json` gets no new dependencies, and no DOM test library is added. `src/sim/` changes only for AC1.

## Out of scope
- Bed assignment, house occupancy and homelessness (step 4 "Wohnraum").
- Chronik messages such as "Mühle fertig gebaut" (next job "Chronik").
- Mine and smithy, locking building types by castle level, and the castle level display (step 6).
- Cancelling or demolishing a building, refunds, building levels, a build queue, and ordering several buildings with one click.
- Showing the names of the residents who work in a building, or assigning a resident to a specific building.
- Changing build costs, build times or workplace numbers in `buildingConstants.ts`.
- Showing the build time in real time (minutes at 1x).
- Sorting or filtering the building list, and grouping it by type.
- Any change to the clock, Lager or Bewohner areas other than what refresh already does.

## Notes for the builder
- Files likely touched: `src/sim/buildings.ts` (`isBuildingType`), `src/sim/commands.ts` (AC1 guard, `unknownBuilding` in `OrderResult`), a new `src/ui/formatBuildings.ts` (`formatDuration`, `formatBuildOptions`, `formatBuildingList`), `src/text/de.ts` (`buildingTypes`, panel strings, order error texts), `src/ui/app.ts` (building list view, build options view, a second alert, order handler), `src/ui/styles.css`, and a new `tests/formatBuildings.test.ts` plus an AC1 case in `tests/commands.test.ts` or `tests/buildings.test.ts`.
- Follow the existing pattern: `build…View()` returns the elements to update, and `update…View(view, rows)` is called from `refresh`. Use a `Map<buildingId, RowView>` like the resident list. The progress bar and the occupancy/beds line of an item switch when the building finishes. Build both up front and toggle `hidden`, or update the text, but do not rebuild the item.
- `runCommand` in `app.ts` is typed for the job commands and writes into the Bewohner alert. Either make it take the target alert element, or add a small separate handler for orders. Keep reading `state` when the handler runs, not at build time.
- Reuse `formatOccupancy` from `formatResidents.ts` instead of writing a second "von … Plätzen" text. Count workers per building with `resident.workplaceId === building.id`. Do not repeat the quota logic of `assignJobs`.
- Use the button's `data-`/closure for the type, and pass it as a `BuildingType`. The AC1 guard is the safety net for tampered values.
- Edge cases to test: ordering the last affordable building, so a second click fails with `notEnoughGoods` and the alert shows; a building finishing in the same tick in which `assignJobs` staffs it (job 007/008 order in `tick`), so the occupancy is correct right after the finishing tick; progress rounds down, never up, so an unfinished building never shows 100 %; singular "1 Arbeitsplatz" / "1 Tag" / "1 Stunde".
- Assumptions for the orchestrator to confirm: the "bauen" buttons stay enabled and show a missing text instead of being disabled; building names get a running number per type; house items show only the bed count.
