# Weizen und Jahreszeiten

## Goal
Farming follows the seasons. In spring and summer, farmers grow wheat on the fields. In autumn they harvest it into the castle storage. In winter the fields rest. To get through winter and the first year, the player has to plan for harvests and stored wheat.

Rules from `docs/vision.md`:
- Section 5, Bauer / Feld: "Weizen, **nur Ernte im Herbst**, wächst Frühling/Sommer".
- Section 9: "Erste Version: nur der **Winter**. Kein Weizenwachstum, Holzverbrauch zum Heizen, Ernte muss gelagert sein."
- Section 4: "4 Jahreszeiten zu je 10 Tagen" and "Start: Frühling, Jahr 1, Tag 1". So the first harvest is no earlier than day 21 (hour 480).
- Section 10: "Lager mit 60 Brot, 40 Wasser, 50 Holz, 20 Stein". The header of the vision document says: "Zahlen sind Startwerte zum Ausbalancieren, keine festen Gesetze." AC9 uses that.

How it works today: since job 007, `RECIPES.farmer` (`src/sim/productionConstants.ts`) puts 0.5 wheat per worker-hour straight into storage in every season, as the comment there says ("Year-round for now; seasonal wheat comes with ..."). `runWorkerHours` in `src/sim/production.ts` is used by both `produceHour` and the dry run in `findShortages`.

## Acceptance criteria

### Wheat on the fields
- AC1: `GameState` gets one new top-level field, `fieldWheat: number`: the wheat growing on all fields together, which is not yet in storage. `createInitialState(seed)` sets it to 0 for every seed. `rngState`, residents, buildings and `jobTargets` stay exactly as before. The state stays plain JSON. `JSON.parse(JSON.stringify(state))` deep-equals the state, including fractional `fieldWheat`.
- AC2: The season of a tick is the season of the hour the tick starts in: `getCalendarAt(state.elapsedHours).season` of the input state. So the tick from hour 479 to 480 is summer, and the tick from 480 to 481 is the first autumn tick.

### What a farmer does in each season
Who counts as a working farmer is unchanged (job 007, AC7 and AC8: a finished field, at most `workplaces` workers, in resident order).
- AC3 (growing, spring and summer): each farmer worker-hour adds `RECIPES.farmer.outputs.wheat` (0.5, unchanged) to `fieldWheat`. Storage wheat does not change. Example: a finished field, 1 farmer, hour 0. After 1 tick `fieldWheat` is 0.5 and `storage.wheat` is unchanged.
- AC4 (harvest, autumn): each farmer worker-hour moves `min(HARVEST_PER_FARMER_HOUR, fieldWheat)` from `fieldWheat` to `storage.wheat`. Nothing grows. Worker-hours run in the existing order (job 007, AC12). Wheat harvested in a tick is in storage for a miller later in the same tick, just as other outputs are. Examples, starting at hour 480 with 1 farmer: `fieldWheat` 10 becomes 8, and storage gains 2. `fieldWheat` 1 becomes 0, and storage gains 1. `fieldWheat` 0 gives no change.
- AC5 (rest, winter): farmers produce and harvest nothing. In every winter tick, `fieldWheat` is 0 at the end of the tick. Wheat not harvested by the end of autumn is lost. Example: hour 720 with `fieldWheat` 5. After 1 tick `fieldWheat` is 0 and `storage.wheat` is unchanged.
- AC6: Seasons decide only what farmers do. All other jobs work the same in every season as before. No job other than the farmer ever changes `fieldWheat`. `fieldWheat` and every storage amount never go below 0.
- AC7: The season rules live in one constants module (for example a new `src/sim/farmingConstants.ts`, or `productionConstants.ts`): `GROWING_SEASONS = ["spring", "summer"]`, `HARVEST_SEASON = "autumn"`, and `HARVEST_PER_FARMER_HOUR = 2`. The amount is a multiple of 1/8, so storage stays exact. No number is written inline in `production.ts`. `RECIPES.farmer` stays `{ inputs: {}, outputs: { wheat: 0.5 } }`, so the production chain (`producersOf`, `getProductionChain`, `missingBuildingsFor`) still shows the farmer as the producer of wheat. The comments in `productionConstants.ts` and `jobConstants.ts` say what the 0.5 now means: growth on the field, not storage per hour.
- AC8: `findShortages` uses the same seasonal rules through the shared worker-hour loop, so its dry run never differs from `produceHour`. It never mutates the state. A farmer never blocks on an input, so farmers never add a missing good.

### Bridging the first year
- AC9: `INITIAL_STORAGE.wheat` becomes 80. A comment in `src/sim/storageConstants.ts` gives the reason. Without it, the 60 bread runs out at the day-8 midnight and no wheat comes in before day 21. The comment also says this deviates from vision section 10, under its balancing clause. All other start goods stay as they are.
  - Measured on `main` with farmers producing nothing before hour 480 and the opening of `tests/opening.test.ts`:
    - 0 wheat: hunger from hour 192.
    - 48 wheat: hunger at hour 480.
    - 64 wheat: 28 bread left at hour 480.
    - 80 wheat: 60 bread left at hour 480, and at least 12 bread at every hour even when the first orders come at hour 48.
- AC10: The opening scenarios in `tests/opening.test.ts` (job 013, AC5 and AC6) still pass with their existing assertions up to day 20. A new scenario runs the day-1 opening up to the end of day 30 (720 ticks) and asserts:
  - every resident's bread and water need is 100 after every midnight;
  - there is no `goodRanOut` entry for bread or water;
  - `storage.wheat` rises during autumn, which shows that the harvest arrived.

### Display
- AC11: When at least one finished field exists, the Lager panel shows one line below the goods list, built by a pure formatter (for example in `src/ui/formatStorage.ts`), in the form "Auf den Feldern: 120 Weizen, wächst". The amount is rounded down like the storage rows. The phase word depends on the tick season (AC2) of the shown state: "wächst" in spring and summer, "Erntezeit" in autumn, "Feld ruht" in winter. All texts are in `src/text/de.ts`, with the phase keyed by `Season` (a `Record<Season, string>`), so a missing season is a type error. Without a finished field the line is hidden. The view builds the element once and only updates `textContent` and `hidden`, following the existing refresh pattern in `app.ts`. There is no live region and no new color, and nothing overflows at a 180 px viewport.

### Tests and build
- AC12: Unit tests with fixed seeds or hand-made states cover AC1 to AC8 and AC11. They include:
  - the AC3, AC4 and AC5 examples;
  - the season switch at hours 479→480 and 719→720;
  - two farmers sharing a small harvest in resident order;
  - a harvest that a miller mills in the same tick when the field comes before the mill in `state.buildings`;
  - one full year from a hand-made state with a finished field and 2 farmers, checked with `toBe`: `fieldWheat` is 480 at hour 480 and is fully in storage after 120 autumn ticks, and `fieldWheat` is 0 at hour 721;
  - the input state is never mutated.
- AC13: Existing tests that the change breaks are updated, not deleted, and still check what they checked before:
  - the year-round farmer test (job 007, AC14) becomes the seasonal test;
  - the 960-tick exact chain (job 007, AC19);
  - farmer outputs in `tests/production.test.ts`;
  - the `INITIAL_STORAGE` pins in `tests/storage.test.ts` and `tests/opening.test.ts`;
  - the exact-shape and key checks in `tests/state.test.ts`.
  - `npm test` and `npm run build` pass, with no new dependencies.

## Out of scope
- Per-field crops, field fertility, and anything about field size. `fieldWheat` is one number for all fields.
- A chronicle entry for a finished harvest or for wheat lost at the start of winter.
- Season-aware bottleneck texts, for example explaining "Engpass: Weizen" in summer as "wächst bis Herbst". Showing idle winter farmers differently in the production chain ("bei der Arbeit" stays as it is).
- Auto-assignment that moves farmers to other jobs in winter.
- Spoilage of stored goods, storage limits, Missernte and other random events.
- Tools speeding up farmers (step 6), heating wood in autumn and winter, and health (later step 4 items).
- Editing `docs/vision.md`. Whether section 10 should list the 80 wheat is a human decision (see assumptions).

## Notes for the builder
- Files likely touched:
  - `src/sim/state.ts`: the `fieldWheat` field, `createInitialState`, and passing the season and `fieldWheat` into production;
  - `src/sim/production.ts`: `runWorkerHours` and `produceHour` take the season and `fieldWheat` and return the new `fieldWheat` too;
  - `src/sim/shortages.ts`;
  - a new farming constants module;
  - `src/sim/storageConstants.ts`, `src/sim/productionConstants.ts` and `src/sim/jobConstants.ts` (comments);
  - `src/ui/formatStorage.ts`, `src/ui/app.ts` (`buildStorageView` and `updateStorageView`) and `src/text/de.ts`.
  - Tests: `production`, `state`, `storage`, `opening`, `formatStorage`, `shortages`.
- Keep the special case for the farmer small and named. For example, a helper that does one farmer worker-hour by season inside the existing loop, so the loop stays shared by `produceHour` and `findShortages`. Update the order comment of `tick`.
- Starting wheat is drained by the miller at 12 a day, so "Weizen ist ausgegangen" shows up in the chronicle around day 7. "Engpass: Weizen" then shows through the rest of spring and summer while a field exists. That is correct under the current rules. Do not change it here.
- Worked numbers for checking: 2 farmers grow 24 wheat a day, which gives 480 per year from 20 growing days. They harvest 4 per hour, so 480 wheat takes 120 hours (5 of the 10 autumn days). One miller uses 12 a day, 480 a year.
- Assumptions for the orchestrator to confirm:
  - The bridge is 80 starting wheat. More starting bread, or a different number, would also work. The vision header allows rebalancing, but section 10 names the exact start goods, so the human may want the vision updated.
  - Unharvested wheat is lost in winter, not carried over to the next autumn.
  - Harvesting needs farmers (2 per worker-hour). It is not an automatic transfer at the start of autumn.
  - Growth depends on farmer worker-hours, not on the field alone.
  - There is one total `fieldWheat`, not one per field.
