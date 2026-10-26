# Build: 015-production-chain-diagram

## Round 1
- What changed:
  - `src/sim/production.ts`: the worker-hour loop moved into the exported `runWorkerHours` (returns storage plus `blockedBy` goods); `produceHour` now wraps it with the same signature and results. New `countWorkersByJob` sums the private `countWorkers` (capacity-capped) per job.
  - `src/sim/needs.ts`: exports `CONSUMED_GOODS`, `ConsumedGood` and `RATION_PER_DAY` (now frozen) so bread and water are not hard-coded a second time.
  - `src/sim/productionChain.ts` (new): `getProductionChain()` builds chain steps in layers from `RECIPES` (no-input jobs first, ties in `JOBS` order, cycle fallback appends the rest); helpers `recipeGoods`, `producersOf`.
  - `src/sim/shortages.ts` (new): `findShortages(state)` = dry run via `runWorkerHours` + residents' daily ration check; bottleneck = missing good where no producing job has a missing input.
  - `src/text/de.ts`: new `de.productionChain` block (heading, list label, "Engpass", "Kein Engpass", "fehlt", "bei der Arbeit", "Bewohner", "essen und trinken").
  - `src/ui/formatProductionChain.ts` (new): pure formatter returning `bottleneckText`, `hasBottleneck` and one row per step plus the residents' row, each good with name, floored amount, `missing`, `bottleneck`.
  - `src/ui/app.ts`: new Produktionskette panel right after Lager; built once from the first formatter result, refresh only sets `textContent`, `hidden` and class names. Arrows are `aria-hidden`; no live region.
  - `src/ui/styles.css`: `.chain-*` styles. Flex-wrap steps with `min-width: 0` children; "fehlt" in the `.build-option-missing` look; bottleneck goods and the active bottleneck line in the `.command-error` look (bold + 2px border). No new colors, no new media query.
  - `tests/chainFixtures.ts`, `tests/shortages.test.ts`, `tests/formatProductionChain.test.ts` (new).
- AC1: `src/sim/shortages.ts:23`; GOODS order / no duplicates in `shortages.test.ts` "returns both lists in GOODS order without duplicates"; non-mutation "does not mutate the state". The module uses no DOM, `Date.now()` or `Math.random()`.
- AC2: shared loop `src/sim/production.ts:77`, used by `produceHour` (`:110`) and `findShortages`. Tests: "follows the produceHour order: a field before the mill ...", "counts a good missing when only the second worker of a building is short", "lists every input of a blocked worker, not only the first one", "ignores residents beyond a building's places, as production does", "never counts a worker in a house, a construction site or an unknown building", "gives produceHour the same storage as runWorkerHours". `tests/production.test.ts` is unchanged and passes.
- AC3: "counts water below the residents' need as missing, and exactly equal as enough (AC3)", "counts bread below the residents' need as missing", "finds nothing missing for residents when there are none ...". Note: all residents count, children included, the same as `consumeDailyFood`.
- AC4: "does not count flour at 0 as missing without a staffed, finished bakery (AC4)"; also "finds nothing missing over the first days of a new game".
- AC5: "names wheat the only bottleneck of the wheat → flour → bread chain", "names water and wood both bottlenecks when both block the baker, water only once", "finds nothing missing in a new game". The case "a missing good no job produces" cannot be built with today's `RECIPES` (every input and every consumed good has a producer), so it is covered only by the code path in `shortages.ts`.
- AC6: `src/sim/productionChain.ts:33`; tests "orders today's jobs from raw goods to bread", "lists the inputs and outputs of RECIPES in GOODS order", "holds every job once, each after every producer of its inputs".
- AC7: `src/text/de.ts:107`; test "has the area heading and every new string".
- AC8: `src/ui/formatProductionChain.ts:41`; tests in `formatProductionChain.test.ts` (initial chain incl. residents' row and worker counts, wheat case, two bottlenecks, capacity-limited count, floor rounding, Stein/Eisenerz/Werkzeug absent, no mutation).
- AC9: covered by the tests named above; all use seed 42 or hand-made states.
- AC10: `src/ui/app.ts:192` (DOM order Lager, Produktionskette, ...), `:655` builds a `section` labelled by its `h2`, bottleneck `<p>` then `<ol aria-label="Schritte der Produktionskette">`; each `li` reads inputs → job (count) → outputs; arrows `aria-hidden="true"` (`:713`). Steps without inputs or outputs get no arrow on that side.
- AC11: visible " fehlt" span per good, toggled with `hidden`; bottleneck goods get `.chain-good-is-bottleneck` (bold, 2px border, existing palette). Bottleneck line and marks come from the same `findShortages` result; test "marks exactly the goods named in the bottleneck line".
- AC12: `updateProductionChainView` (`src/ui/app.ts:734`) changes only `textContent`, `hidden` and class names; no `innerHTML`, no `aria-live`/`role`. The two `role="alert"` elements stay the only live regions.
- AC13: checked with headless Firefox screenshots of the built app at 360 px and 180 px wide (initial state and a hand-made bottleneck state): no horizontal scroll, the Bäcker step wraps inside the panel. Still one `@media` rule in `styles.css`. 200 % zoom on 360 px is equivalent to the 180 px check.
- AC14: `npm test` and `npm run build` pass; no test deleted; no new dependencies.
- Test run: `npm test`, 408 tests in 22 files, all passing. `npm run build` passes.
