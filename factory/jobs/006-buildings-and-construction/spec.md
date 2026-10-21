# Buildings and construction (Gebäude und Bauaufträge)

## Goal
The game state gets buildings. There is a fixed set of building types, and each type has a cost in wood and stone, a build time and a number of workplaces (houses have beds instead). A pure command orders a building: it pays the cost from the castle storage at once, and `tick` finishes the building on its own once the build time has passed. A new game starts with 2 finished houses. Later jobs (production, job assignment, housing, castle levels, the building panel) need this list of buildings, so its shape is settled here.

Rules from `docs/vision.md`:
- Section 6: "Jeder Beruf braucht ein Arbeitsgebäude mit einer festen Zahl an Arbeitsplätzen." "Wohnhäuser bieten Betten." "Bauen kostet Holz und Stein und dauert eine feste Zeit. Gebaut wird automatisch, es gibt keinen eigenen Baumeister." "Gebäudestufen kommen später."
- Section 5: the work buildings of the five start jobs are Brunnen, Feld, Mühle, Bäckerei and Holzfällerhütte. Mine and Schmiede only come with castle level 2.
- Section 8: castle level 2 needs "15 Bewohner, Mühle und Bäckerei gebaut". Stone only comes from the mine, which needs level 2.
- Section 10: "2 Wohnhäuser, Lager mit … 50 Holz, 20 Stein."
- Section 4: 1 tick = 1 game hour.

## Acceptance criteria

### Building types
- AC1: `src/sim/` exports `BUILDING_TYPES = ["house", "well", "field", "mill", "bakery", "woodcutterHut"] as const` and a type `BuildingType` derived from it. There is no mine and no smithy yet.
- AC2: One building constants module in `src/sim/` (for example `src/sim/buildingConstants.ts`) holds one definition per type. It is typed `Readonly<Record<BuildingType, BuildingDefinition>>` so a missing type is a type error, and it is frozen like `INITIAL_STORAGE`. A `BuildingDefinition` has exactly these fields: `cost: { wood: number; stone: number }`, `buildHours: number`, `workplaces: number` and `beds: number`. The start values are:

  | Type | Wood | Stone | buildHours | workplaces | beds |
  |---|---|---|---|---|---|
  | house | 20 | 0 | 48 | 0 | 4 |
  | well | 10 | 0 | 24 | 2 | 0 |
  | field | 5 | 0 | 12 | 4 | 0 |
  | mill | 15 | 8 | 72 | 2 | 0 |
  | bakery | 15 | 8 | 72 | 2 | 0 |
  | woodcutterHut | 10 | 0 | 24 | 2 | 0 |

  These numbers are not written inline anywhere else. Tests refer to the constants, except one test that pins the table above.
- AC3: Every value in the table is a non-negative integer, and every `buildHours` is at least 1. A test checks one balance invariant: the stone cost of one mill plus one bakery is at most the starting stone (`INITIAL_STORAGE.stone`). Without it, castle level 2 could never be reached, because stone only comes from the level-2 mine.

### Buildings in the state
- AC4: `src/sim/` exports a plain-data `Building` type with exactly these fields: `id: number` (a positive integer, unique within the game and never reused), `type: BuildingType`, and `hoursLeft: number`. `hoursLeft` is the number of build hours still missing, and a building is finished when it is 0. A finished building and a building under construction are both entries in the same list, so a building keeps its `id` when it is finished.
- AC5: `GameState` gets two new fields. `buildings: Building[]` holds all buildings in order of creation. `nextBuildingId: number` is the id the next building gets. All existing fields keep their names, meanings and values.
- AC6: `createInitialState(seed)` starts with `START_HOUSES` (2) finished houses: `[{ id: 1, type: "house", hoursLeft: 0 }, { id: 2, type: "house", hoursLeft: 0 }]`, and `nextBuildingId` is 3. The starting houses are free: `storage` still equals `INITIAL_STORAGE`. No random draws are used, so `rngState`, the residents and their needs are exactly as before this job for every seed. `START_HOUSES` lives in the building constants module.
- AC7: A pure helper such as `isFinished(building)` returns `true` exactly when `hoursLeft` is 0. A pure helper such as `getBuildingDefinition(type)` (or direct use of the constants record) gives the definition for a type.

### Ordering a building
- AC8: A pure command, for example `orderBuilding(state: GameState, type: BuildingType): OrderResult`, lives in `src/sim/`. It never mutates `state`. On success it returns `{ ok: true, state }`, where the new state:
  - has the type's `cost.wood` and `cost.stone` taken from `storage`, and no other good changed,
  - has a new building `{ id: state.nextBuildingId, type, hoursLeft: definition.buildHours }` appended to `buildings`,
  - has `nextBuildingId` raised by 1,
  - is otherwise unchanged (`elapsedHours`, `rngState`, `residents`, `nextResidentId`).
- AC9: If `storage.wood` is less than `cost.wood` or `storage.stone` is less than `cost.stone`, the command returns `{ ok: false, reason: "notEnoughGoods" }`, and nothing is paid or added. A storage amount never goes below 0. Exactly enough is enough: with 15 wood and 8 stone a mill can be ordered and the storage ends at 0 wood and 0 stone.
- AC10: Any number of buildings may be under construction at the same time, and any number of buildings of one type may exist. Example: from the initial state (50 wood, 20 stone), ordering a mill and then a bakery succeeds and leaves 20 wood and 4 stone. Ordering a second mill then fails with `notEnoughGoods` (stone 4 < 8), and the state after the failed order deep-equals the state before it.

### Construction over time
- AC11: Every tick lowers `hoursLeft` of every building that is under construction by exactly 1, all in parallel and never below 0. Finished buildings do not change. The order of `buildings` and all ids stay the same.
- AC12: A building ordered at any hour is finished after exactly `buildHours` ticks. After `buildHours - 1` ticks its `hoursLeft` is 1, after `buildHours` ticks it is 0, and further ticks keep it at 0. Example: a field ordered on the initial state is finished on tick 12. A mill ordered at the same time is finished on tick 72.
- AC13: Construction does not touch `storage`, `residents`, `rngState`, `nextResidentId` or `nextBuildingId`. The daily food consumption from job 005 still happens exactly as before, on the same ticks and with the same results. A construction that finishes on a midnight tick still finishes on that tick.

### Purity, determinism, plain data
- AC14: `tick` and `orderBuilding` never mutate their input, including nested `storage`, `buildings` and each `Building` (the input deep-equals a `structuredClone` taken before the call). The same input gives deep-equal results. Neither uses randomness.
- AC15: `GameState` stays plain JSON data: `JSON.parse(JSON.stringify(state))` deep-equals the state (`toStrictEqual`) for the initial state, after an order, and after ticks while a building is under construction and after it is finished.
- AC16: `createInitialState` returns fresh building objects on every call. Changing a building of one state in a test changes no other state and not the constants.

### Tests, build, UI
- AC17: Unit tests in `tests/` (for example a new `tests/buildings.test.ts`) use fixed seeds or hand-made states and cover AC1 to AC16. Existing tests that the new state shape breaks are updated, not deleted, and still check what they checked before. In `tests/state.test.ts` these are the exact-shape `toEqual` after 960 ticks (it now also expects the two starting houses and `nextBuildingId: 3`) and the `Object.keys` list. `npm test` and `npm run build` pass. `package.json` gets no new dependencies.
- AC18: Nothing in `src/ui/`, `src/main.ts` or `src/text/de.ts` changes. The page looks and behaves as before.

## Out of scope
- Any building display or order button in the UI, and German building names in `src/text/de.ts`. These belong to the step 3 item "Gebäude-Panel".
- Chronik messages such as "Mühle fertig gebaut" (step 3 "Chronik").
- Linking buildings to jobs, workers in workplaces, and production (step 2 "Produktion" and "Berufszuteilung"). This job only stores the number of workplaces.
- Assigning residents to beds, homelessness, and heating houses with wood (step 4 "Wohnraum", "Wärme"). This job only stores the number of beds.
- Mine and smithy, and locking building types by castle level (step 6).
- Building levels ("Gebäudestufen kommen später"), demolishing, cancelling an order with a refund, a build queue that runs one order at a time, and paying the cost bit by bit during construction.
- Builders or workers needed for construction. The vision says there is no builder.
- Save game versioning or migrating old states (step 7).

## Notes for the builder
- Files likely touched: new `src/sim/buildingConstants.ts` (`START_HOUSES`, the definitions table), new `src/sim/buildings.ts` (`BUILDING_TYPES`, `BuildingType`, `BuildingDefinition`, `Building`, `isFinished`, a pure `advanceConstruction(buildings) -> buildings`, `orderBuilding`, the starting houses), `src/sim/state.ts` (new fields, starting houses, `tick` calls the construction step every tick). Tests: new `tests/buildings.test.ts`, updated `tests/state.test.ts`. `tests/storage.test.ts`, `tests/residents.test.ts` and `tests/needs.test.ts` should keep passing. Check any of them that build a `GameState` by hand, because they now need `buildings` and `nextBuildingId`.
- `orderBuilding` takes a `GameState` and returns a new one, so it imports from `state.ts`. If that creates an import cycle with `buildings.ts`, put the command in its own module (for example `src/sim/commands.ts`). This is the first command; later commands from the UI will follow the same pattern.
- In `tick`, keep the steps readable: advance the hour, advance construction, then do the daily consumption on a day boundary. Return a new `buildings` array only when something is under construction, or always. Either is fine as long as the input is never mutated.
- Make `OrderResult` a discriminated union on `ok`, so callers must check it before using `state`.
- The definitions are frozen. Freeze the nested `cost` objects as well, or type them `Readonly`, so a test that tries to change them cannot reach the next game.
- Edge cases to test: storage with exactly the cost; one good enough and the other not (wood short, stone short); a type with stone cost 0 ordered with 0 stone in storage; two orders in a row get ids 3 and 4; an order on a state with `elapsedHours` not 0; several buildings with different build times finishing on different ticks; a building finishing on tick 24 (midnight) next to the daily consumption; `hoursLeft` never negative over many ticks.
- Assumptions to confirm with the orchestrator (each one is a constant or a single line): every number in the AC2 table (the vision gives none); houses have 4 beds, so the 2 starting houses hold the 8 settlers; houses, wells, fields and woodcutter huts cost no stone, so the 20 starting stones are enough for the mill and the bakery that castle level 2 needs; the full cost is paid when the building is ordered; all orders build at the same time.
