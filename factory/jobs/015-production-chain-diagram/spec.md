# Produktionskette (production chain diagram with the current bottleneck)

## Goal
A new area "Produktionskette" shows how jobs and goods connect: which job makes which good, which job uses which good, and what the residents eat and drink. It also marks every good that is missing right now and names the current bottleneck (Engpass), the missing good at the start of the problem. When bread stops being made, the player can see at a glance whether the cause is wheat, flour, water or wood, without reading every number.

Rules from `docs/vision.md`:
- Section 2: "Darstellung | Verwaltungsoberfläche (Panels, Tabellen, Kettendiagramm)". This job adds the Kettendiagramm.
- Section 5: the job table (Wasserträger → Wasser; Bauer → Weizen; Müller: Weizen → Mehl; Bäcker: Mehl, Wasser, Holz → Brot; Holzfäller → Holz) and "Alle essen Brot und trinken Wasser."
- Section 3: "Simulationskern als reine Funktionen … Oberfläche liest den Zustand und schickt Befehle …, ändert den Zustand aber nie direkt."
- Section 2: "Oberfläche Deutsch, Code Englisch, Texte zentral gesammelt".

What exists today:
- `RECIPES` in `src/sim/productionConstants.ts` gives inputs and outputs per job per worker-hour. Only these five jobs exist (`JOBS` in `src/sim/jobs.ts`). Miner and smith come later and will add recipes.
- `produceHour` in `src/sim/production.ts` runs worker-hours one after the other: buildings in list order, and within a building the workers in resident order (`countWorkers`, a private function). Outputs of an earlier worker-hour can be used by later ones in the same hour. If a worker's inputs are not all fully in storage, that worker does nothing.
- `consumeDailyFood` in `src/sim/needs.ts` takes `BREAD_PER_RESIDENT_PER_DAY` (1) and `WATER_PER_RESIDENT_PER_DAY` (1) per resident at hour 0.
- The chronicle (job 012) records "ist ausgegangen" only when stock reaches exactly 0. Its spec left a demand-based shortage rule for this job.
- `src/ui/app.ts` builds the page once and updates it in place. The areas in DOM order are Lager, Bewohner, Gebäude, Chronik.

## Acceptance criteria

### Simulation core: what is missing
- AC1: A new pure module, for example `src/sim/shortages.ts`, exports `findShortages(state: GameState)`. It returns `{ missing: Good[]; bottlenecks: Good[] }`, both in `GOODS` order and without duplicates. It never mutates the state. `src/sim/` stays free of DOM access, `Date.now()` and `Math.random()`.
- AC2: A good is **missing for production** when, in a dry run of the coming hour with exactly the same rules and order as `produceHour` (same workers, same building and resident order, outputs of earlier worker-hours available to later ones), at least one worker cannot work because the stock of that good is below that worker's recipe amount at their turn. If one blocked worker is short of several inputs, every one of those goods counts as missing. A worker who can work never makes a good missing. The worker-hour loop is not written twice: extract a shared helper from `production.ts` that both `produceHour` and `findShortages` use, and `produceHour` gives exactly the same results as before (all existing tests in `tests/production.test.ts` pass unchanged).
- AC3: A good is **missing for residents** when it is eaten or drunk daily and its stock is below the number of residents times the daily ration (`BREAD_PER_RESIDENT_PER_DAY`, `WATER_PER_RESIDENT_PER_DAY` from `src/sim/needConstants.ts`). In other words, the stock is not enough for everyone at the next meal. With 0 residents nothing is missing for residents.
- AC4: `missing` holds every good that is missing under AC2 or AC3. A good that nobody needs right now is never missing, even at stock 0. Example: with no finished, staffed bakery, Mehl at 0 is not missing.
- AC5: `bottlenecks` are the missing goods at the start of the problem. A missing good is a bottleneck when no input of any job that produces it (according to `RECIPES`) is itself missing. A missing good that no job produces also counts as a bottleneck. Examples:
  - Weizen 0 with a staffed mill and no staffed field, so the miller is blocked; Mehl 0 and the baker is blocked; Brot below the residents' need. Then `missing` is Weizen, Mehl, Brot and `bottlenecks` is Weizen only.
  - Wasser and Holz both block the baker, nothing else is missing. Then both are bottlenecks.
  - Nothing is missing. Then both lists are empty.
- AC6: The chain structure comes from data, not from a hand-written list. A pure function, for example `getProductionChain()` in the same module or next to `RECIPES`, returns the job steps in chain order. Each step lists the job, its input goods and its output goods, in `GOODS` order. Chain order: jobs without inputs first, then each job after every job that produces one of its inputs; ties in `JOBS` order. For today's recipes this gives Wasserträger, Bauer, Holzfäller, Müller, Bäcker. A miner or smith added later appears without changes to this function.

### Texts and formatting (pure, DOM-free, unit-tested)
- AC7: `src/text/de.ts` holds every new string. That covers the area heading "Produktionskette", the label for the residents' step (for example "Bewohner" with "essen und trinken"), the word marking a missing good (for example "fehlt"), the bottleneck line ("Engpass: Weizen", or for several goods "Engpass: Wasser, Holz") and the text when nothing is missing (for example "Kein Engpass"). It also covers the worker count per job ("2 bei der Arbeit"; singular and plural are not needed if the wording works for both). Job and good names come from the existing `de.jobs` and `de.goods`.
- AC8: A pure formatter, for example `formatProductionChain(state)` in a new `src/ui/formatProductionChain.ts`, returns:
  - `bottleneckText`: the AC7 bottleneck line built from `findShortages(state).bottlenecks`, or the "Kein Engpass" text;
  - one row per step from `getProductionChain()` in chain order, each with the job name, the number of residents who work at that job this hour (the same count `produceHour` uses, so a resident beyond a building's places does not count), and its inputs and outputs;
  - one last row for the residents, whose inputs are Brot and Wasser (the goods of `consumeDailyFood`) and who have no outputs;
  - for each good shown in a row, its name, its stock rounded down like the Lager panel does (`Math.floor`), `missing: boolean` and `bottleneck: boolean` from AC1.
  Goods that no step uses or makes (today Stein, Eisenerz, Werkzeug) do not appear.
- AC9: Unit tests with a fixed seed cover AC1 to AC8. They check:
  - the initial state: nothing is missing, no bottleneck, and the text is "Kein Engpass";
  - the AC5 Weizen → Mehl → Brot case on a hand-made state;
  - a case with two bottlenecks at once (Wasser and Holz block the baker);
  - a field listed before the mill, with wheat at 0 at the start of the hour, does not make Weizen missing, because the farmer's output reaches the miller in the same hour (AC2 order). The same state with the mill listed before the field does make Weizen missing;
  - a staffed building that is short only for the second of two workers still makes the good missing;
  - Wasser below the number of residents is missing under AC3, and exactly equal is not;
  - Mehl at 0 without a staffed bakery is not missing (AC4);
  - `getProductionChain()` gives the AC6 order with the inputs and outputs of `RECIPES`;
  - `findShortages` and `formatProductionChain` do not mutate their input;
  - the formatter rows and texts match AC8, including the residents' row and the worker counts.

### Produktionskette area
- AC10: `src/ui/app.ts` adds an area "Produktionskette", built with the existing panel pattern (a `section` labelled by its own `h2`), placed right after Lager in DOM order. It shows the bottleneck line first, then the chain as an ordered list (`<ol>` with an accessible name), one item per AC8 row, in chain order. Each item reads as a step from left to right: input goods, then the job with its worker count, then output goods (for example "Weizen 12 → Müller (1 bei der Arbeit) → Mehl 0"). The arrows are decorative and hidden from screen readers (`aria-hidden="true"`), so a screen reader reads the goods, the job and the counts in a sensible order.
- AC11: A missing good is marked with visible text (the AC7 "fehlt" word), not by color alone. A bottleneck good also gets a stronger visual mark, for example bold and a thicker border, reusing the existing palette and the look of `.build-option-missing` or `.command-error`. No new colors are added. The bottleneck line names the same goods that are marked as bottleneck in the list.
- AC12: Rendering follows jobs 009 to 012. The page is built once. On `refresh`, only `textContent`, `hidden` and class names (or a data attribute) change. Items are not rebuilt, since the chain's shape does not change during a game. Text is set with `textContent`, never `innerHTML`. The area is not a live region (no `aria-live`, `role="alert"` or `role="status"`), so ticks at 4x do not flood screen readers. The two existing `role="alert"` elements stay the only live regions.
- AC13: Layout, checked by reading `src/ui/styles.css` and with `npm run dev` in device mode. At 360 px viewport width and at 200 % zoom on a 360 px viewport, and also at a 180 px viewport (the bar from job 014), nothing scrolls horizontally. Long steps such as the Bäcker step with three inputs wrap inside the panel. The breakpoint from job 009 stays the only media query, and the existing panel style and tabular digits are reused.

### Tests and build
- AC14: `npm test` and `npm run build` pass. No existing test is deleted. `package.json` gets no new dependencies, and no DOM test library is added.

## Out of scope
- A graphical diagram (SVG or canvas with lines and boxes) or a 2D map. The chain is a structured list.
- Wood for construction (paid upfront in `orderBuilding`) and wood for heating (comes with "Wärme"). Neither counts as demand in AC2 or AC3.
- Predicting future shortages ("Brot reicht noch 2 Tage"), production and consumption rates per day, and balance advice.
- Naming the cause behind a bottleneck, such as "kein Brunnen gebaut" or "Wunschzahl 0", and buttons in the diagram that order buildings or change wish numbers.
- New chronicle entries for bottlenecks. The chronicle keeps its exactly-0 rule from job 012.
- Seasonal wheat, miner, smith and tools. They come with their own jobs, and AC6 makes them appear automatically.
- Changing balance numbers, recipes or the order of steps in `tick`.

## Notes for the builder
- Files likely touched: `src/sim/production.ts` (extract the worker-hour loop, for example into a function that returns the new storage plus the goods that blocked a worker; `produceHour` keeps its signature and behavior), the new `src/sim/shortages.ts`, `src/text/de.ts`, the new `src/ui/formatProductionChain.ts`, `src/ui/app.ts`, `src/ui/styles.css`, and the new `tests/shortages.test.ts` and `tests/formatProductionChain.test.ts`.
- The worker count per job in AC8 should come from the same counting `produceHour` uses (`countWorkers`, which can be exported or wrapped). Do not reuse `formatJobTargets`' `working`, which counts residents by workplace without the capacity limit.
- The residents' goods in AC3 are the consumed goods in `needs.ts` (`CONSUMED_GOODS` with their rations). Export them, or a small helper, instead of hard-coding bread and water a second time.
- Storage amounts are multiples of 1/8 (see `productionConstants.ts`), so plain `<` comparisons are exact. Do not add an epsilon.
- Chain order (AC6) can be found with a simple repeated pass: take the next job in `JOBS` order whose input producers are all placed already. A cycle (later: smith needs ore, miner is sped up by tools) must not loop forever. Tools only speed the miner up and are not a recipe input, so no cycle exists in `RECIPES`. Still, if no job can be placed, append the rest in `JOBS` order.
- Edge cases to test: a worker in a construction site or a house never counts (same as production); a good that is both missing for production and for residents (Wasser) appears once; the bottleneck line lists several goods in `GOODS` order.
- Assumptions for the orchestrator to confirm:
  - "Ware, die fehlt" is defined by current demand (AC2: a blocked worker in the coming hour; AC3: stock below one daily ration for every resident), not by stock 0.
  - "der aktuelle Engpass" is the root of the problem (AC5), and there can be more than one.
  - The area goes right after Lager.
  - The diagram is a text list with arrows, not a drawing.
