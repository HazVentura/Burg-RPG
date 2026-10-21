# Build: 006-buildings-and-construction

## Round 1
- What changed:
  - `src/sim/buildings.ts` (new): `BUILDING_TYPES`, `BuildingType`, `BuildingDefinition`, `Building`, `isFinished`, pure `advanceConstruction`.
  - `src/sim/buildingConstants.ts` (new): frozen `BUILDING_DEFINITIONS` table (nested `cost` frozen too), `START_HOUSES = 2`, `getBuildingDefinition`.
  - `src/sim/commands.ts` (new): `orderBuilding` and the discriminated union `OrderResult` (own module to avoid a cycle with `state.ts`).
  - `src/sim/state.ts`: `buildings` and `nextBuildingId` fields; fresh starting houses in `createInitialState`; `tick` advances construction every hour before the daily consumption.
  - `tests/buildings.test.ts` (new): covers AC1-AC16.
  - `tests/state.test.ts`: 960-tick exact-shape `toEqual` now expects the two houses and `nextBuildingId: 3`; `Object.keys` list and number checks include the new fields.
  - `tests/needs.test.ts`: hand-made `stateBeforeMidnight` gets `buildings: []`, `nextBuildingId: 1`; the top-level-keys test lists the two new fields.
- AC1: "lists the six start building types without mine and smithy"
- AC2: "pins the start balance table", "has exactly one definition per type", "gives every definition exactly the four fields", "freezes the definitions, each definition and each cost"; type `Readonly<Record<BuildingType, Readonly<BuildingDefinition>>>` in `src/sim/buildingConstants.ts`
- AC3: "uses non-negative integers everywhere and at least 1 build hour", "lets the starting stone pay for one mill and one bakery"
- AC4: "gives every building exactly the fields id, type and hoursLeft", "never makes hoursLeft negative over many ticks and keeps order and ids"
- AC5: `tests/state.test.ts` keys/shape tests; "gives two orders in a row the ids 3 and 4"
- AC6: "starts with START_HOUSES finished houses and nextBuildingId 3", "does not charge for the starting houses", "does not change rngState or residents"; plus the unchanged pinned settler/rngState tests in `tests/needs.test.ts` and `tests/state.test.ts`
- AC7: "isFinished is true exactly when hoursLeft is 0", "returns the definition of a type from getBuildingDefinition"
- AC8: "pays the cost, appends the building and raises nextBuildingId", "changes no good other than wood and stone"
- AC9: "accepts exactly enough goods...", "refuses when wood is short...", "refuses when stone is short...", "orders a building without stone cost with 0 stone", "never lets storage go below 0..."
- AC10: "orders a mill, then a bakery, then refuses a second mill", "allows many buildings of one type under construction at once"
- AC11: "lowers hoursLeft of every unfinished building by 1 per tick, in parallel", "never makes hoursLeft negative..."
- AC12: "finishes a field on tick 12 and a mill on tick 72", "finishes every type after exactly buildHours ticks and keeps it at 0", "works on a state with elapsedHours not 0", "finishes buildings ordered at different hours on their own ticks"
- AC13: "does not touch storage, residents, rngState, nextResidentId or nextBuildingId outside midnight", "keeps daily consumption the same and finishes a building on a midnight tick"
- AC14: "tick does not mutate the state, its buildings or any building", "does not mutate its input and is deterministic" (orderBuilding), "advanceConstruction returns a new array..."
- AC15: "survives a JSON round trip initially, after an order, during and after construction"
- AC16: "returns fresh building objects on every call", "does not change the constants when a game's building is changed"
- AC17: tests above; existing tests updated, none deleted; no new dependencies.
- AC18: no changes in `src/ui/`, `src/main.ts`, `src/text/de.ts` (`git diff main --stat`).
- Test run: `npm test`, 187 tests, all passing; `npm run build` passes.
