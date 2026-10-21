# Burglager (castle storage)

## Goal
The game state gets a central castle storage that holds a stock of each of the eight goods, starting with the amounts from the vision. A storage panel on the page shows the stock of every good. Production, consumption and building (step 2) will read and write this storage, so the goods list and the stock shape must be settled now.

Rules from `docs/vision.md`:
- Section 2: "Waren | Zentrales Burglager"
- Section 5: the goods are Weizen, Mehl, Brot, Wasser, Holz, Eisenerz, Stein, Werkzeug.
- Section 10: "Lager mit 60 Brot, 40 Wasser, 50 Holz, 20 Stein."
- Section 11, step 1: "Zeit und Tick-Schleife (Pause, Tempo), Lager"

## Acceptance criteria

### Goods and stock in the simulation core
- AC1: `src/sim/` exports the goods as one ordered array constant, `GOODS = ["wheat", "flour", "bread", "water", "wood", "stone", "ironOre", "tools"] as const`, and a type `Good` derived from it. The order is the order of the feature request and is the display order of the panel.
- AC2: `src/sim/` exports a type `Storage = Record<Good, number>`. `GameState` gets a new field `storage: Storage` that holds one amount per good. Existing fields `elapsedHours` and `rngState` keep their names, meaning and values.
- AC3: `createInitialState(seed)` fills `storage` with the start values from vision section 10: bread 60, water 40, wood 50, stone 20, and 0 for wheat, flour, ironOre and tools. Every good from `GOODS` has an entry, and there are no other keys.
- AC4: The start values live in one storage constants module in `src/sim/` (for example `src/sim/storageConstants.ts`) as a named constant typed `Storage` (for example `INITIAL_STORAGE`), so a missing good is a type error. `createInitialState` takes the values from it, not from inline numbers.
- AC5: `createInitialState` returns a fresh `storage` object each call. Changing the storage of one returned state (in a test) changes neither another state nor the constant from AC4.
- AC6: `tick` leaves the storage unchanged: after 960 ticks the storage deep-equals the initial storage. `tick` still does not mutate its argument, including `storage` (the input state deep-equals a `structuredClone` taken before the call).
- AC7: `GameState` stays plain JSON data (job 001, AC2): `JSON.parse(JSON.stringify(state))` deep-equals the state, for the initial state and after ticks. `storage` is a plain object whose values are all finite, non-negative numbers.

### Display text
- AC8: `src/text/de.ts` holds every new player-facing string: the panel name "Lager" and the German good names keyed by `Good` (`Record<Good, string>`, so a missing good is a type error): wheat "Weizen", flour "Mehl", bread "Brot", water "Wasser", wood "Holz", stone "Stein", ironOre "Eisenerz", tools "Werkzeug". Any column headers or labels the panel shows also live there.
- AC9: A pure, DOM-free formatting function in `src/ui/` (for example `formatStorage(storage: Storage)` in `src/ui/formatStorage.ts`) returns one row per good in `GOODS` order, each with the German name and the amount as a display string. Amounts are shown as whole numbers rounded down (`Math.floor`), so a later fractional stock such as 0.5 never shows as available "1". Unit tests cover the initial storage (Weizen 0, Mehl 0, Brot 60, Wasser 40, Holz 50, Stein 20, Eisenerz 0, Werkzeug 0, in that order) and a storage with a fractional value (for example 12.9 shows as "12").

### Page (checked by reading the code and running `npm run dev`)
- AC10: Below the clock section the page shows a storage panel: a `<section>` with a visible heading "Lager" that also names the section for assistive technology (for example `aria-labelledby` pointing at the heading). It lists all eight goods in `GOODS` order, including goods with stock 0, each with its German name and amount from AC9. Right after load it shows the start values from AC3.
- AC11: Each name is programmatically tied to its amount (for example a `<dl>` with `<dt>`/`<dd>` pairs, like the clock, or a `<table>` with header cells). Amounts use tabular digits so the column does not jitter.
- AC12: The panel is built once. On each `refresh` in `src/ui/app.ts` (after ticks), only the amount elements' `textContent` is updated from the current `GameState`, so later jobs that change the storage show up without more UI work. The clock section and its buttons are not rebuilt, and button focus behavior from job 002 (AC16) still holds. The panel is not an `aria-live` region.
- AC13: The UI never writes to `state.storage`. Values are set with `textContent`, not `innerHTML`.
- AC14: The panel fits a 360 px wide viewport without horizontal scrolling and matches the clock section's look (border, background, spacing from `src/ui/styles.css`).
- AC15: Unit tests in `tests/` cover AC1 and AC3 to AC7 with a fixed seed, plus AC9. Existing tests that assume `GameState` has only number fields are updated, not deleted. `npm test` and `npm run build` pass. No new dependencies in `package.json`.

## Out of scope
- Adding or removing goods from the storage: helper functions or commands for withdraw/deposit, production, consumption, building costs. These come with step 2 jobs ("Essen und Trinken", "Gebäude", "Produktion").
- Storage capacity limits, warehouse buildings, spoilage.
- Hiding Eisenerz and Werkzeug until castle level 2. The vision ties Bergmann and Schmied to level 2, not the goods; all eight goods are shown.
- Shortage warnings or markers ("Mehl ist ausgegangen"), which belong to the Chronik and chain diagram jobs.
- Change indicators (trends, +/- per day), icons, sorting or filtering.
- Money, prices, market.
- The full layout with areas for residents and buildings ("Grundlayout der Verwaltungsoberfläche").
- Save game version number and `localStorage` (step 7).
- DOM tests with jsdom; only pure modules get unit tests.

## Notes for the builder
- Files likely touched: new `src/sim/goods.ts` (or put `GOODS`, `Good`, `Storage` in `src/sim/storage.ts`), new `src/sim/storageConstants.ts`, `src/sim/state.ts`, `src/text/de.ts`, new `src/ui/formatStorage.ts`, `src/ui/app.ts`, `src/ui/styles.css`. Tests: update `tests/state.test.ts`, new `tests/storage.test.ts` and `tests/formatStorage.test.ts`.
- Follow the job 001/002 patterns: a short header comment explaining why, Vitest globals, `SEED = 42` in tests, `SEASONS`-style `as const` array with a derived type, and a `Record<Season, string>`-style map in `de.ts`.
- `tests/state.test.ts` currently has "is a plain object holding only finite numbers" (iterates `Object.values(state)` expecting numbers) and `expect(current).toEqual({ elapsedHours: 960, rngState: 42 })`. Both break once `storage` exists; adapt them to the new shape and keep what they check.
- AC5: copy the constant (for example `{ ...INITIAL_STORAGE }`) instead of sharing the reference; a shared reference would let one game's changes leak into the next. Consider `Object.freeze` or `Readonly<Storage>` for the constant.
- `tick` already spreads `state`, which keeps the same `storage` reference. That is fine as long as nothing mutates it (AC6); do not deep-copy every tick without a reason.
- `refresh` in `app.ts` today only updates the clock view; extend it to also update the storage view, and keep a `Map<Good, HTMLElement>` (or a `Record`) of amount elements built once, like `speedButtons`.
- Edge cases to test: every key in `GOODS` present and no extra keys, goods with 0 shown, fractional amounts rounded down, mutation isolation between two `createInitialState` calls, storage unchanged after 960 ticks, JSON round trip with the nested object.
- Assumption to confirm with the orchestrator: English identifiers `ironOre` and `tools` (plural, as a stock of tools). Rounding down in the display (AC9) is a choice made so that a later fractional stock does not look available; it is a one-line change if a different rule is wanted.
