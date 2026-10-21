# Residents as individuals (Bewohner als Einzelpersonen)

## Goal
The game state gets its first residents. Each one is an individual with a name, an age, a sex and a partner. A new game starts with 4 couples (8 adults) whose German medieval names come from a seeded name generator. Every later step 2 to 5 feature (needs, jobs, housing, births, death) works on this list, so the resident shape, the id scheme and the way age is stored must be settled now.

Rules from `docs/vision.md`:
- Section 7: "Jeder Bewohner ist eine Einzelperson mit Name, Alter, Geschlecht, Partner, Beruf, Bedürfnissen und Erfahrung pro Beruf." This job covers only Name, Alter, Geschlecht and Partner.
- Section 7.2: "Erwachsen | ab 5" (game years). "Altersschwäche möglich | ab ca. 25".
- Section 10: "Frühling, Tag 1. 4 Paare (8 Erwachsene)".
- Section 3: "Zufall nur über einen übergebenen Zufallsgenerator mit Startwert (Seed), damit Tests reproduzierbar sind."
- Section 4: one game year = 40 days of 24 hours, which is 960 ticks.

## Acceptance criteria

### Resident shape
- AC1: `src/sim/` exports `SEXES = ["female", "male"] as const` and a type `Sex` derived from it. It also exports a `Resident` type with exactly these plain-data fields:
  - `id: number`: a positive integer, unique within the game and never reused
  - `name: string`: the given name
  - `sex: Sex`
  - `bornAtHour: number`: the integer `elapsedHours` value at which the resident was born. It is negative for the starting settlers, who were born before the game began.
  - `partnerId: number | null`: the `id` of the partner, or `null` if the resident has no partner
- AC2: `GameState` gets two new fields. `residents: Resident[]` holds all residents in creation order. `nextResidentId: number` is the id the next new resident will get. The existing fields `elapsedHours` and `storage` keep their names, meaning and values. `rngState` keeps its name and meaning, but its start value changes (AC10).
- AC3: Age is derived from `bornAtHour`, not stored. A pure function `getAgeYears(resident: Resident, elapsedHours: number): number` returns the completed game years, `Math.floor((elapsedHours - resident.bornAtHour) / HOURS_PER_YEAR)`. `HOURS_PER_YEAR` (960) is a named constant in `src/sim/timeConstants.ts`, derived from `HOURS_PER_DAY`, `DAYS_PER_SEASON` and `SEASONS_PER_YEAR`. It is not written as the literal 960. Tests with a hand-made resident whose `bornAtHour` is `-5 * HOURS_PER_YEAR` give age 5 at `elapsedHours` 0 and 959, and age 6 at 960.

### Starting settlers
- AC4: `createInitialState(seed)` creates `START_COUPLES` couples (4), so 8 residents. Each couple is one `female` and one `male` resident whose `partnerId`s point at each other. Partners are listed next to each other in `residents`, female first. Every resident has a partner.
- AC5: The starting residents have ids `1` to `8` in list order, and `nextResidentId` is `9`.
- AC6: Every starting resident is an adult with a random whole-year age between `START_AGE_MIN_YEARS` (5, from "Erwachsen ab 5") and `START_AGE_MAX_YEARS` (10), both inclusive. Their birthdays are spread over the year. `bornAtHour = -(ageYears * HOURS_PER_YEAR + birthDayOffset * HOURS_PER_DAY)`, where `birthDayOffset` is a random integer from 0 to the days per year minus 1 (0 to 39). So `getAgeYears(resident, 0)` equals the drawn age, and `bornAtHour` is an integer.
- AC7: Each partner's age is drawn independently. There is no rule tying partners' ages together.

### Name generator
- AC8: A name module in `src/sim/` holds two lists of German medieval given names, one female and one male, typed by `Sex` (for example `Record<Sex, readonly string[]>`). Each list has at least 30 names. A list has no duplicates, and the two lists share no name. Every name is a non-empty string with no leading or trailing whitespace. The names are period-appropriate German given names (for example Adelheid, Gertrud, Hedwig, Kunigunde, Mechthild; Konrad, Heinrich, Gottfried, Ulrich, Wolfram), not modern names.
- AC9: A pure function, for example `pickName(random: Random, sex: Sex, taken: readonly string[]): string`, returns a name from the list for `sex` that is not in `taken`, chosen with `random.next()` and never with `Math.random()`. If every name of that list is taken, it returns any name from the list instead of failing. The same random state and the same input give the same name. Tests cover a normal pick, a pick that must avoid taken names, and the exhausted-list fallback.
- AC10: `createInitialState(seed)` draws all random values (names, ages, birthday offsets) from one `createRandom(seed)` generator, then stores that generator's final state in `rngState`. So `createRandom(state.rngState)` continues the sequence where settler creation stopped. The order of draws is fixed in code, so the result is reproducible.
- AC11: The 8 starting residents have 8 different names, and each name comes from the list for that resident's sex.

### Determinism, purity, plain data
- AC12: The same seed gives deep-equal states, including `residents`. Different seeds give different settlers: across seeds 1 to 20 there are at least two different lists of starting names.
- AC13: `tick` leaves `residents`, `nextResidentId` and `rngState` unchanged. After 960 ticks they deep-equal the initial values, while `getAgeYears` of each resident has gone up by exactly 1. `tick` still does not mutate its argument (the input deep-equals a `structuredClone` taken before the call).
- AC14: `GameState` stays plain JSON data (job 001 AC2): `JSON.parse(JSON.stringify(state))` deep-equals the state (`toStrictEqual`), both for the initial state and after ticks. `partnerId: null` survives the round trip.
- AC15: `createInitialState` returns fresh resident objects each call. Changing a resident of one state in a test changes no other state.
- AC16: The numbers `START_COUPLES` (4), `START_AGE_MIN_YEARS` (5) and `START_AGE_MAX_YEARS` (10) live in one resident constants module in `src/sim/` (for example `src/sim/residentConstants.ts`). They are not written inline.

### Tests and build
- AC17: Unit tests in `tests/` use fixed seeds and cover AC3 to AC15. Existing tests that the new state shape or the new `rngState` start value breaks are updated, not deleted, and still check what they checked before. These are in `tests/state.test.ts`: the exact-shape `toEqual` after 960 ticks, the `Object.keys` list, and the `rngState` tests for seeds 42, 0 and -1. `npm test` and `npm run build` pass. `package.json` gets no new dependencies.
- AC18: Nothing in `src/ui/`, `src/main.ts` or `src/text/de.ts` changes. The page looks and behaves as before.

## Out of scope
- Any resident display in the UI. The resident list belongs to the step 3 backlog item "Bewohnerliste: Name, Alter, Beruf, Bedürfnisbalken".
- Jobs, needs (Brot, Wasser, Wohnraum, Wärme, Gesundheit) and experience per job. These are later backlog items.
- Life phases (child, apprentice, adult), births, death, widowhood and migration (step 5 and step 4). This job only makes age derivable.
- Surnames, bynames ("der Müller"), family or house names, and parent or child links.
- Forming or breaking couples during the game, and same-sex couples. The starting couples are woman and man because the later "Geburten" item has couples produce children. Changing this later only affects the settler creation.
- German labels for `Sex`, and age formatting.
- Save game version number and `localStorage` (step 7).
- Changing `src/sim/random.ts` or adding integer helpers to it, unless one small helper is clearly needed. If so, add it with a test.

## Notes for the builder
- Files likely touched: new `src/sim/residents.ts` (`SEXES`, `Sex`, `Resident`, `getAgeYears`, settler creation), new `src/sim/names.ts` (name lists, `pickName`), new `src/sim/residentConstants.ts`, `src/sim/timeConstants.ts` (`HOURS_PER_YEAR`, and a days-per-year constant if useful), `src/sim/state.ts`. Tests: new `tests/residents.test.ts` and `tests/names.test.ts`, updated `tests/state.test.ts`. Check `tests/storage.test.ts`, `tests/calendar.test.ts` and `tests/formatClock.test.ts` still pass. They spread `createInitialState(SEED)`, which should keep working.
- Name lists in `src/sim/`, not `src/text/de.ts`: the names are simulation data stored in the game state and in save games, and the core must not import from the text layer. They are proper nouns, not UI strings to translate. Say so in the module's header comment, so reviewers do not read it as a breach of the `de.ts` rule in `CLAUDE.md`.
- Why `bornAtHour` instead of an `age` field: `tick` does not need to touch residents for them to age, age is always consistent with the calendar, and the later "Altern" and "Geburten" jobs only need `bornAtHour = state.elapsedHours` for a newborn. Why `nextResidentId`: ids stay unique after deaths, so a `partnerId` never points at a different person.
- Random integers: use `Math.floor(random.next() * n)` for an index in `[0, n)` and `min + Math.floor(random.next() * (max - min + 1))` for an inclusive range. Pick from the list of names not yet taken (filter, then index), so one draw is enough and there is no retry loop.
- One `Random` instance flows through settler creation. Pass it into helpers instead of re-seeding. Re-seeding with the same value would give every couple the same draws.
- Today `rngState` equals `seed >>> 0`. After this job it is the generator state after the settler draws. Replace the old exact-value tests (42, 0, 4294967295) with checks that are still meaningful: `rngState` is a 32-bit unsigned integer, it is deterministic per seed, it differs between seeds 1 and 2, and `createRandom(state.rngState).next()` equals the next value of a generator that ran through the same draws.
- `noUncheckedIndexedAccess` is on: indexing a name list gives `string | undefined`. Handle it like `seasonAt` in `src/sim/calendar.ts`, not with a blind `!`.
- Edge cases to test: partner symmetry (`a.partnerId === b.id` and `b.partnerId === a.id`), no resident partnered with itself, exactly 4 female and 4 male residents, ages at the min and max bounds over many seeds (for example seeds 0 to 199 always fall in 5 to 10, and both bounds appear at least once), `birthDayOffset` keeping age exact at hour 0, seed 0 and seed -1, and `pickName` with an empty `taken` list and with all names but one taken.
- Assumptions to confirm with the orchestrator: start ages 5 to 10 years (the vision gives only "Erwachsen ab 5" and old age from about 25), sex values `female`/`male`, given names only, and settler ages measured from game hour 0. Each of these is a constant or a single line to change.
