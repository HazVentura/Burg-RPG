# Production of the 5 starting jobs (Produktion der Startberufe)

## Goal
Residents can work in a finished work building. Each tick (one game hour), every worker in a well, field, mill, bakery or woodcutter hut takes their job's input goods from the castle storage and adds the output goods. This is the first time the castle storage can grow, and the bread chain (Weizen → Mehl → Brot) runs. The next backlog item ("Berufszuteilung") fills the workplaces; this job settles how a resident is linked to a workplace and what one hour of work does.

Rules from `docs/vision.md`:
- Section 5, table: Wasserträger / Brunnen / – / Wasser; Bauer / Feld / (Werkzeug beschleunigt) / Weizen; Müller / Mühle / Weizen / Mehl; Bäcker / Bäckerei / Mehl, Wasser, Holz (Ofen) / Brot; Holzfäller / Holzfällerhütte / (Werkzeug beschleunigt) / Holz. All five are "Frei ab: Start".
- Section 5: the farmer's harvest is "nur Ernte im Herbst, wächst Frühling/Sommer". The feature request overrides this for now: "Bauer produziert vorerst ganzjährig". Seasons come with the step 4 item "Weizen und Jahreszeiten".
- Section 6: "Jeder Beruf braucht ein Arbeitsgebäude mit einer festen Zahl an Arbeitsplätzen."
- Section 4: "1 Tick = 1 Spielstunde."
- Section 2 / 10: there is one central castle storage (`state.storage`).

## Acceptance criteria

### Jobs
- AC1: `src/sim/` (for example a new `src/sim/jobs.ts`) exports `JOBS = ["waterCarrier", "farmer", "miller", "baker", "woodcutter"] as const` and a type `Job` derived from it. There is no miner and no smith yet.
- AC2: A record typed `Readonly<Record<Job, BuildingType>>` (for example `JOB_BUILDING`) maps each job to its work building: `waterCarrier → well`, `farmer → field`, `miller → mill`, `baker → bakery`, `woodcutter → woodcutterHut`. A pure helper such as `jobForBuilding(type: BuildingType): Job | null` returns the job of a work building and `null` for `house`. Every building type with `workplaces > 0` has exactly one job, and `house` has none (a test checks this against `BUILDING_DEFINITIONS`).

### Recipes (balance numbers)
- AC3: One production constants module in `src/sim/` (for example `src/sim/productionConstants.ts`) holds one recipe per job, typed `Readonly<Record<Job, Recipe>>` and frozen like `BUILDING_DEFINITIONS` (nested objects too). A `Recipe` has `inputs` and `outputs`, each a partial map from `Good` to the amount per worker per hour. The start values are:

  | Job | Inputs per worker-hour | Outputs per worker-hour |
  |---|---|---|
  | waterCarrier | – | water 0.5 |
  | farmer | – | wheat 0.5 |
  | miller | wheat 0.5 | flour 0.5 |
  | baker | flour 0.25, water 0.25, wood 0.125 | bread 0.5 |
  | woodcutter | – | wood 0.5 |

  These numbers are not written inline anywhere else. Tests refer to the constants, except one test that pins this table.
- AC4: Every recipe amount is a positive multiple of 1/8 (a test checks `amount * 8` is a positive integer). Each recipe has at least one output, and no good is both an input and an output of the same recipe. Tools appear in no recipe ("Werkzeug beschleunigt" comes with step 6).

### Residents and workplaces
- AC5: `Resident` gets one new field, `workplaceId: number | null`: the id of the building the resident works in, or `null` for no workplace. All existing `Resident` fields keep their names, meanings and values. `GameState` gets no new top-level field.
- AC6: Every settler from `createInitialState(seed)` starts with `workplaceId: null`. No random draws are added, so `rngState`, names, ages, partners and needs stay exactly as before this job for every seed. Since nobody works at the start, a new game's state after any number of ticks deep-equals what it was before this job, apart from the new `workplaceId: null` fields.

### Who works
- AC7: In a tick, a resident works exactly when their `workplaceId` is the id of a building in `state.buildings` that is finished (`hoursLeft === 0`) at the start of the tick and whose type has a job (AC2). A resident whose `workplaceId` is `null`, points to no existing building, points to a house, or points to a building under construction does not work. No error is thrown, and the resident's `workplaceId` is left unchanged.
- AC8: At most `workplaces` residents work in one building per tick: the first ones in `state.residents` order whose `workplaceId` points to it. Example: three residents point to one well (2 workplaces); only the first two in list order work, so water rises by 1 per tick, not 1.5.
- AC9: Production uses the buildings as they are at the start of the tick. So a building whose construction finishes on tick t produces for the first time on tick t+1. Example: a well ordered on the initial state (24 build hours) with one worker pointing to it leaves water unchanged by production on ticks 1 to 24 and adds 0.5 on tick 25.
- AC10: Age, sex, partner and needs do not affect work in this job. Any resident who meets AC7 and AC8 works at full rate every hour of the day and in every season.

### One hour of production
- AC11: On every tick, each working resident (AC7, AC8) does one worker-hour of their job's recipe: if `storage` holds at least the full input amount of every input good, those inputs are taken from `storage` and the outputs are added. Otherwise that worker produces nothing this hour and takes nothing. Inputs are never taken in part, and no storage amount ever goes below 0.
- AC12: Worker-hours are done one after the other: buildings in `state.buildings` order, and within one building its workers in `state.residents` order. Outputs of an earlier worker-hour are in `storage` for later ones in the same tick. Example: buildings `[bakery (id 3), mill (id 4)]`, one worker each, storage wheat 0.5 and flour 0. Tick 1: the baker has no flour and idles, the miller makes flour (wheat 0, flour 0.5). Tick 2: the baker uses 0.25 flour and makes 0.5 bread; the miller has no wheat and idles. With the order `[mill, bakery]` the baker already bakes on tick 1.
- AC13: Shortage inside one building: a bakery with 2 workers and storage flour 0.25 (enough water and wood) bakes once in that tick. The first worker in list order bakes, and the second idles. Flour ends at 0 and bread rises by 0.5.
- AC14: The farmer produces `wheat` at the same rate in all four seasons, with no inputs (feature request: "Bauer produziert vorerst ganzjährig"). A test checks one farmer-hour in a spring, summer, autumn and winter hour.
- AC15: Production only changes `storage`. `residents`, `buildings`, `rngState`, `nextResidentId`, `nextBuildingId` stay as construction and daily consumption leave them.
- AC16: Order inside `tick`: production runs every tick, and on a midnight tick it runs before the daily food consumption from job 005, so the bread and water made in hour 23→0 can be eaten that midnight. Pinned example: initial state (seed 42) plus a finished well with id 3 (`nextBuildingId` 4) and resident 1 with `workplaceId: 3`. After 1 tick water is 40.5. After 24 ticks water is 44 (40 + 24 × 0.5 − 8) and bread is 52. Construction from job 006 keeps working as before.

### Purity, determinism, plain data
- AC17: `tick` never mutates its input, including nested `storage`, `residents` and `buildings` (the input deep-equals a `structuredClone` taken before the call). The same input gives deep-equal results. Production uses no randomness.
- AC18: `GameState` stays plain JSON data: `JSON.parse(JSON.stringify(state))` deep-equals the state (`toStrictEqual`) for the initial state and after ticks with workers in each of the five building types, including fractional storage amounts and `workplaceId` values of both `null` and a number.
- AC19: Because all recipe amounts are multiples of 1/8 (AC4), storage amounts stay exact. A test runs a chain (well, field, mill, bakery, woodcutter hut, one worker each, enough starting goods) for 960 ticks and checks the storage against values computed from the constants with `toBe`, not `toBeCloseTo`.

### Tests, build, UI
- AC20: Unit tests in `tests/` (for example a new `tests/production.test.ts`) use fixed seeds or hand-made states and cover AC1 to AC19. Existing tests that the new `Resident` field breaks are updated, not deleted, and still check what they checked before: the `Object.keys(resident)` list in `tests/residents.test.ts`, the hand-made residents in `tests/needs.test.ts`, and any exact-shape `toEqual` in `tests/state.test.ts`. `npm test` and `npm run build` pass. `package.json` gets no new dependencies.
- AC21: Nothing in `src/ui/`, `src/main.ts` or `src/text/de.ts` changes. Since no resident has a workplace in a new game, the running page looks and behaves exactly as before.

## Out of scope
- Assigning residents to workplaces: wish numbers per job, automatic distribution of free adults, pinning a person to a job, and any command that sets `workplaceId` (next backlog item "Berufszuteilung"). Tests set `workplaceId` in hand-made states.
- Seasonal wheat: growth in spring/summer, harvest in autumn, a resting field in winter (step 4 "Weizen und Jahreszeiten").
- Tools speeding up farmer and woodcutter, tool wear, miner and smith (step 6).
- Experience levels and their +10 % per level, apprentices at half rate, children not working (step 5 and 6). Age has no effect yet (AC10).
- Health or low needs slowing work (step 4 "Gesundheit").
- Working hours, night rest or days off. Workers work all 24 hours.
- Storage limits, spoilage, and stopping production when a good is plentiful.
- German job names, any job or production display in the UI, the chain diagram and bottleneck marker, and Chronik messages such as "Mehl ist ausgegangen" (step 3).
- Save game versioning or migrating old states (step 7).

## Notes for the builder
- Files likely touched: new `src/sim/jobs.ts` (`JOBS`, `Job`, `JOB_BUILDING`, `jobForBuilding`), new `src/sim/productionConstants.ts` (`Recipe`, the recipe table), new `src/sim/production.ts` (a pure step such as `produceHour(buildings, residents, storage) -> Storage`), `src/sim/residents.ts` (`workplaceId` field, settlers start with `null`), `src/sim/state.ts` (`tick` calls the production step). Tests: new `tests/production.test.ts`, updates to `tests/residents.test.ts`, `tests/needs.test.ts`, `tests/state.test.ts`, maybe `tests/buildings.test.ts` if it builds residents by hand.
- `tick` order (AC9, AC16): run production on the input state's buildings, then advance construction, then the daily consumption on a day boundary. Keep each step a named function call so `tick` stays readable.
- Counting workers (AC8): walk `residents` once, keep a count per building id, and skip a resident once their building is full. Do not reorder `state.residents`.
- Work on a copy of `storage` inside the step; return the input object unchanged (or a copy) when nobody works. Either is fine as long as the input is never mutated.
- Iterate recipe goods with `GOODS` order or `Object.entries` on the partial map; with `noUncheckedIndexedAccess` on, treat a missing amount as "not part of the recipe", not as 0 via `!`.
- Edge cases to test: inputs exactly enough (storage ends at 0), one of three baker inputs short (nothing taken), a worker pointing at a deleted or unknown id, a house, a building under construction, two buildings of the same type each with workers, a building finishing on a midnight tick, an empty resident list, and the AC12 order example both ways.
- Assumptions to confirm with the orchestrator (each one is a constant or a line): every number in the AC3 table (the vision gives none; one water carrier makes 12 water a day, a baker turns 6 flour, 6 water and 3 wood into 12 bread a day, so one baker feeds the 8 settlers); production every hour of the day; the link is `workplaceId` on the resident, and the job follows from the building type; a building produces from the tick after it is finished; earlier buildings in the list are served first when inputs run short.
