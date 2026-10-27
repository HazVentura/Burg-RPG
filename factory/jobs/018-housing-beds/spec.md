# Wohnraum: Betten, Bedürfnis Wohnraum, Obdachlose

## Goal
Every resident sleeps in a bed in a finished Wohnhaus, or is homeless when there are too few beds. A new need, Wohnraum, shows whether a resident has a bed. The player sees at a glance who lives where and how many residents are homeless, so they know when to build another house. Later steps (Wärme, Gesundheit, Geburten) build on this.

Rules from `docs/vision.md`:
- Section 6: "Wohnhäuser bieten Betten."
- Section 7.1: "Jedes Bedürfnis ist ein Wert von 0 bis 100." and "**Wohnraum:** erfüllt, wenn die Person ein Bett hat."
- Section 7.1: "Wer obdachlos ist, friert im Winter immer." (Wärme is the next backlog item. This job only provides who is homeless.)
- Section 10: "4 Paare (8 Erwachsene), 2 Wohnhäuser". `BUILDING_DEFINITIONS.house.beds` is 4, so the start has exactly 8 beds for 8 residents.

How it works today:
- `Resident` has no home.
- `Needs` is `{ bread, water }`. `consumeDailyFood` (`src/sim/needs.ts`) sets each need to 100 at midnight when the ration is served, and otherwise lowers it by `NEED_DROP_PER_DAY_WITHOUT` (15).
- Houses already have `beds: 4` and `workplaces: 0`. `formatBuildingList` shows "4 Betten" for every house, finished or not.
- No resident is ever added or removed yet, so today homelessness only happens in hand-made states. It becomes real with births (step 5).

## Acceptance criteria

### Beds
- AC1: `Resident` gets one new field, `homeId: number | null`. It is the id of the house the resident sleeps in, or null when the resident is homeless. Nothing else is added to `Resident` or to `GameState`. The state stays plain JSON, and `JSON.parse(JSON.stringify(state))` deep-equals the state.
- AC2: A pure function, for example `assignHomes(state): GameState` in a new `src/sim/housing.ts`, decides `homeId` for every resident. It only changes `homeId`. It follows these rules:
  - Only finished buildings of type `house` offer beds. Each one offers `getBuildingDefinition("house").beds`, which is not written inline.
  - A `homeId` that does not point to a finished house is cleared: unknown id, wrong type, or under construction.
  - Pass 1 (keep): residents keep their valid home in `state.residents` order, as long as that house still has a free bed.
  - Pass 2 (place): every resident still without a bed takes a free bed in the first house in `state.buildings` order that has one. This also goes in `state.residents` order.
  - Residents of every age get a bed. Age, sex, job and needs do not matter.
  - A house never holds more residents than it has beds.
  - The function is idempotent: running it twice gives the same result as running it once.
  - It never mutates its input. A resident whose `homeId` does not change is the same object as in the input. When nothing changes, it returns the input state unchanged, following the pattern of `assignJobs`.
- AC3: `createInitialState(seed)` gives every settler a bed through the same function. For every seed, residents 1 to 4 live in house id 1, residents 5 to 8 live in house id 2, and nobody is homeless. `rngState`, names, ages, partners, storage, buildings and `jobTargets` stay exactly as before, so the seeded draw order does not change.
- AC4: `tick` runs bed assignment every tick, after construction (step 2) and before the daily needs at midnight. A house that finishes in a tick has its beds taken by the end of the same tick. If it finishes on the step into midnight, its new residents already count as housed for that day's Wohnraum update (AC6). Update the order comment on `tick` to match.

### Need Wohnraum
- AC5: `Needs` gets a third key, `housing`. `createFullNeeds()` sets it to `NEED_MAX`. Starting settlers have `housing: 100`. `CONSUMED_GOODS` and `RATION_PER_DAY` stay bread and water only, because housing does not take goods from storage.
- AC6: On the step into hour 0 of every new day, in the same step where residents eat and drink, each resident's `housing` need is updated:
  - with a bed (`homeId !== null`), it becomes `NEED_MAX`;
  - without one, it drops by `HOUSING_DROP_PER_DAY_WITHOUT` and never goes below `NEED_MIN`.
  The constant lives in `src/sim/needConstants.ts` with value 15, the same as food. A comment says why. It is not inline in the code. Between midnights, `housing` does not change.
  - Examples: a homeless resident with `housing` 100 has 85 after the first midnight, 70 after the second, and 0 after the seventh. A homeless resident at 40 who gets a bed at hour 30 still shows 40 until hour 48, then shows 100.
- AC7: Bread and water work exactly as before. The food tests and the opening scenarios in `tests/opening.test.ts` pass with their existing assertions. In the day-30 opening scenario, every resident's `housing` is 100 after every midnight.

### Display
- AC8: Each row of the Bewohnerliste shows a third need bar labelled "Wohnraum", after Brot and Wasser (`NEED_ORDER` becomes `["bread", "water", "housing"]`). It uses the same meter and number as the other bars, through `de.needs`, which stays keyed by `keyof Needs`.
- AC9: Each row of the Bewohnerliste shows one more fact after Beruf, labelled "Unterkunft":
  - with a bed, the house's display name from `buildingDisplayNames`, for example "Wohnhaus 2";
  - without a bed, "Obdachlos".
  The text comes from a pure formatter (`formatResidentList`, as a new `ResidentRow` field). The view builds the element once and only updates `textContent`.
- AC10: `formatResidentSummary` returns a second row, "Obdachlos", with the number of residents whose `homeId` is null, right after "Anzahl". The row is also shown when the count is 0, so the rows never change shape. Example: the start state gives `[["Anzahl", "8"], ["Obdachlos", "0"]]`.
- AC11: In the Gebäudeliste, a finished house shows how many of its beds are taken, for example "3 von 4 Betten belegt", with "Bett" in the singular for exactly 1 bed. The count is the residents whose `homeId` is that house. A house under construction keeps showing "4 Betten". Build options keep showing "4 Betten". Work buildings do not change.
- AC12: All new texts are in `src/text/de.ts`: "Wohnraum", "Unterkunft", "Obdachlos", and the "von … Betten belegt" parts. There is no new color, no new live region, and nothing overflows at a 180 px viewport (the zoom check from job 014).

### Tests and build
- AC13: Unit tests with fixed seeds or hand-made states cover AC1 to AC6 and AC8 to AC11. They include:
  - the start layout (AC3) for at least two seeds;
  - 10 residents and 2 finished houses, where residents 9 and 10 are homeless;
  - a third house under construction, which gives no beds until it finishes, then takes both homeless residents in the same tick;
  - a resident with an invalid `homeId` (unknown id, a well, an unfinished house), whose home is cleared and replaced;
  - keeping a home: a resident who already lives in house 2 is not moved to a free bed in house 1;
  - idempotence, and no mutation of the input;
  - the AC6 examples, checked with `toBe`;
  - the formatter texts for a housed and a homeless resident, the summary row, and "3 von 4 Betten belegt" and "1 von 4 Betten belegt".
- AC14: Existing tests that the change breaks are updated, not deleted, and still check what they checked before. This includes:
  - the resident key list in `tests/residents.test.ts`;
  - the `needs` literals in the fixtures (`chainFixtures`, `chronicle`, `assignment`, `production`, `residents`);
  - `de.needs` in `tests/formatResidents.test.ts`;
  - the resident summary in `tests/formatSummary.test.ts`;
  - the house text in `tests/formatBuildings.test.ts`;
  - the shape checks in `tests/state.test.ts`.
  `npm test` and `npm run build` pass, with no new dependencies.

## Out of scope
- A player command to move a resident to a specific house or bed. Assignment is automatic only. The request's "zuweisen" is met by the automatic assignment.
- Keeping couples or families in the same house on purpose. At the start they end up together only because of the resident order.
- Wärme, Holz for heating, freezing in winter, and Gesundheit (the next backlog items).
- Births needing a free bed, Abwanderung, and any effect of low Wohnraum on work or anything else.
- Chronicle entries for someone becoming homeless or moving in.
- A homeless count in the production chain, and a "Engpass: Wohnhaus" text.
- House levels, bed counts other than the existing 4, and changing house cost or build time.
- Saving and loading (step 7). There are no saves yet, so there is nothing to migrate.

## Notes for the builder
- Files likely touched:
  - new `src/sim/housing.ts`;
  - `src/sim/residents.ts` (`homeId: null` in `createSettler`);
  - `src/sim/state.ts` (`createInitialState`, `advanceHour`, the order comment);
  - `src/sim/needs.ts` (the `housing` key and the midnight update);
  - `src/sim/needConstants.ts`;
  - `src/ui/formatResidents.ts`, `src/ui/formatSummary.ts`, `src/ui/formatBuildings.ts`, `src/ui/app.ts` (`buildResidentRow` and `updateResidentRow`);
  - `src/text/de.ts`;
  - tests as listed in AC13 and AC14.
- Follow `assignJobs` in `src/sim/assignment.ts`: passes in list order, keep before place, return the same object when nothing changes, and a header comment that lists the passes.
- `consumeDailyFood` loops over `CONSUMED_GOODS`. Keep housing out of that loop. A small separate function, for example `updateHousingNeed(residents)` called in the same midnight step, is clearer than overloading the goods loop. Do not change the serving order for bread and water.
- `formatOccupancy` in `formatResidents.ts` already builds "x von y Plätzen besetzt". Write a sibling for beds instead of generalizing it, so the job texts stay as they are.
- The `.waiting-note` style is meant for a pinned resident waiting for a workplace. Do not reuse it for "Obdachlos" unless it reads well. The Wohnraum bar dropping into its low look already flags a homeless resident.
- Assumptions for the orchestrator to confirm:
  - Wohnraum drops gradually at midnight (15 per day), like food. It does not jump to 0 at once.
  - Children get beds the same way as adults.
  - Bed assignment is fully automatic, with no player command.
