# Food and drink (Essen und Trinken)

## Goal
Every resident gets two needs, bread and water, each a value from 0 to 100. Once per game day each resident eats one bread and drinks one water from the castle storage. A resident who gets no bread or no water that day loses points on that need. Bread and water now actually run out, and later features (health, migration, births, the resident list) get a per-person supply value to work with.

Rules from `docs/vision.md`:
- Section 7.1: "Jedes Bedürfnis ist ein Wert von 0 bis 100." and "**Brot, Wasser:** werden täglich aus dem Lager verbraucht."
- Section 5: "Alle essen Brot und trinken Wasser."
- Section 7.2: "Kind: isst, arbeitet nicht". Everyone eats, whatever their age.
- Section 10: the game starts with 60 bread and 40 water for 8 residents.
- Section 4: 1 tick = 1 game hour, 24 ticks per day.

## Acceptance criteria

### Need shape
- AC1: `Resident` (in `src/sim/residents.ts`) gets one new field, `needs: Needs`. `Needs` is an exported plain-data type with exactly two fields, `bread: number` and `water: number`. Each is a value from `NEED_MIN` (0) to `NEED_MAX` (100), both inclusive. All existing `Resident` fields keep their names, meanings and values. `GameState` gets no new top-level field.
- AC2: Every starting settler from `createInitialState(seed)` starts with `needs` of `{ bread: NEED_MAX, water: NEED_MAX }`. Each resident has its own `needs` object: changing one resident's needs in a test does not change another resident's or another state's needs. Creating needs uses no random draws, so `rngState` and the settlers' names, ages and partners stay exactly as they were before this job for every seed.

### Daily consumption
- AC3: Consumption runs exactly once per game day, in the tick whose new `elapsedHours` is a multiple of `HOURS_PER_DAY`, which is the step into hour 0 of a new day. The first time is on tick 24. After 23 ticks the storage and all needs still equal the initial state. After 24 ticks one day has been consumed. After 960 ticks (one year), 40 days have been consumed.
- AC4: On each daily consumption, every resident who gets their ration takes `BREAD_PER_RESIDENT_PER_DAY` (1) bread and `WATER_PER_RESIDENT_PER_DAY` (1) water from `state.storage`. Bread and water are handled independently: a resident can get water and no bread, or the other way round. No other good changes.
- AC5: A resident only gets a ration if the storage still holds at least one full ration of that good. Rations are never split, and a storage amount never goes below 0.
- AC6: If there is not enough for everyone, residents with the lowest value of that need are served first. Ties go to whoever comes first in `residents`. The order is worked out separately for bread and for water. Example: 3 bread in storage, 8 residents all at 100. Residents 1 to 3 (list order) get bread, residents 4 to 8 do not, and bread storage ends at 0.
- AC7: A resident who gets their ration of a good has that need set to `NEED_MAX`. A resident who does not get it has that need lowered by `NEED_DROP_PER_DAY_WITHOUT` (25), but never below `NEED_MIN`. So a resident without water drops 100 → 75 → 50 → 25 → 0 over four days and stays at 0 after that.
- AC8: A test with the start values pins the outcome. With 8 residents, 60 bread and 40 water, after 5 days (120 ticks) the storage holds 20 bread and 0 water, and every need is 100. After 6 days (144 ticks) it holds 12 bread and 0 water, every bread need is 100 and every water need is 75. After 8 days (192 ticks) bread is 0. Residents 1 to 4 have bread 100, and residents 5 to 8 have bread 75 (on day 8 only 4 bread were left, and the ties went by list order). All water needs are 25.
- AC9: Consumption works for any number of residents, including none. With an empty `residents` list, the storage does not change. Hand-made states with a single resident, or with mixed need values, follow AC4 to AC7.

### Purity, determinism, plain data
- AC10: `tick` still never mutates its input, including nested `storage`, `residents` and `needs` (the input deep-equals a `structuredClone` taken before the call, on consumption ticks too). It uses no randomness, and `rngState` and `nextResidentId` stay unchanged. The same state gives deep-equal results.
- AC11: `GameState` stays plain JSON data: `JSON.parse(JSON.stringify(state))` deep-equals the state (`toStrictEqual`) for the initial state and after 24, 120 and 960 ticks. All need values and storage amounts are finite numbers in their ranges.
- AC12: The numbers `NEED_MIN` (0), `NEED_MAX` (100), `BREAD_PER_RESIDENT_PER_DAY` (1), `WATER_PER_RESIDENT_PER_DAY` (1) and `NEED_DROP_PER_DAY_WITHOUT` (25) live in one needs constants module in `src/sim/` (for example `src/sim/needConstants.ts`). They are not written inline. Tests refer to the constants where the test does not deliberately pin the numbers (AC8 pins them).

### Tests, build, UI
- AC13: Unit tests in `tests/` (for example a new `tests/needs.test.ts`) use fixed seeds or hand-made states and cover AC2 to AC11. Existing tests that assumed `tick` never changes storage or residents are updated, not deleted, so they keep checking what still holds: in `tests/storage.test.ts`, "leaves the storage unchanged over 960 ticks"; in `tests/residents.test.ts`, "leaves residents, nextResidentId and rngState unchanged over 960 ticks"; in `tests/state.test.ts`, the exact-shape `toEqual` after 960 ticks. For example, they can check that every good except bread and water is unchanged, and that ids, names, sexes, `bornAtHour` and `partnerId` are unchanged. `npm test` and `npm run build` pass. `package.json` gets no new dependencies.
- AC14: Nothing in `src/ui/`, `src/main.ts` or `src/text/de.ts` changes. The existing storage panel already reads `state.storage`, so in the running game the Brot and Wasser amounts now drop by 8 at each midnight. Wasser shows 0 from day 6, hour 0, on. That is the only visible change.

## Out of scope
- Showing needs in the UI (need bars). This belongs to the step 3 backlog item "Bewohnerliste: Name, Alter, Beruf, Bedürfnisbalken".
- Chronik messages such as "Brot ist ausgegangen" (step 3 "Chronik").
- Health, and any effect of low needs on work, births, death or migration (step 4 "Gesundheit", "Abwanderung", step 5).
- Housing and warmth needs (step 4). `Needs` only gets `bread` and `water` now. The later jobs add their own fields.
- Producing bread or water (step 2 "Produktion"). With no production yet, water runs out on day 6 and bread on day 8. That is expected.
- Different rations for children or apprentices, partial rations, hourly consumption, and slow recovery of a need after a shortage.
- Save game versioning or migrating old states (step 7). No saves exist yet.

## Notes for the builder
- Files likely touched: new `src/sim/needConstants.ts` and `src/sim/needs.ts` (the `Needs` type, and a pure function such as `consumeDailyFood(residents, storage) -> { residents, storage }`), `src/sim/residents.ts` (`needs` field; settlers get full needs), `src/sim/state.ts` (`tick` calls the daily consumption when the new hour is a day boundary). Tests: new `tests/needs.test.ts`, plus updates to `tests/state.test.ts`, `tests/storage.test.ts` and `tests/residents.test.ts`. The draw-order test in `tests/residents.test.ts` spreads `...resident`, so it should keep passing.
- Detect the day boundary with `HOURS_PER_DAY` from `src/sim/timeConstants.ts`, not the literal 24.
- Keep `tick` readable. Advance the hour first, then apply the daily step to the new state. Return new `storage`, `residents` and `needs` objects only where something changed, or always on consumption ticks. Either is fine as long as the input is never mutated (AC10).
- Serving order (AC6): sort a copy of the residents' indices by need value, then by list index. Do not use `Array.prototype.sort` stability on its own as the tie-break; compare the indices explicitly. Do not reorder `state.residents` itself.
- Look up `Needs` keys through the matching `Good` (`bread`, `water`). The need names are the same as the good names on purpose, so one loop over `["bread", "water"] as const` with a per-good ration constant can handle both.
- `noUncheckedIndexedAccess` is on. Handle `undefined` from indexing like `seasonAt` in `src/sim/calendar.ts`, not with a blind `!`.
- Edge cases to test: exactly one ration left for two residents with different need values (the lower one gets it), storage at exactly 0, a need already at 0 staying at 0, a resident at 25 who gets fed going straight back to 100, bread available while water is not, an empty resident list, and no consumption on ticks 1 to 23 or 25 to 47.
- Assumptions to confirm with the orchestrator (each is a constant or one line): 1 bread and 1 water per resident per day; consumption at midnight (the tick into hour 0), so the first meal is at the end of day 1 and not at game start; a fed need goes straight back to 100 instead of recovering slowly (the vision gives slow recovery only for health); a drop of 25 per day without (0 after four days); neediest first, then list order, when supplies are short.
