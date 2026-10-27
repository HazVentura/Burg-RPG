# Korrekturen Produktionskette: Umbruch der Überschrift, Engpass für Screenreader, fehlendes Gebäude als Ursache

## Goal
Three follow-ups from the reviews of job 015 (`factory/jobs/015-production-chain-diagram/decision.md`). Afterwards:
- the heading "Produktionskette" breaks cleanly at 200 % zoom;
- a screen reader user hears which good in the chain is the Engpass;
- the bottleneck line says when the building that makes the good does not exist, for example "Engpass: Brot (keine Bäckerei)".

So the player sees right away that they have to build something, without searching the Gebäude panel.

Evidence from round 1 of job 015:
- `review-play.md`: at a 180 px viewport (360 px at 200 % zoom) the heading breaks mid-word as "Produktions / kette" (`round-1/play/zoom200-0.png`). The review suggests a soft hyphen (U+00AD).
- `review-ux.md`: `buildChainGood` in `src/ui/app.ts` marks a bottleneck good only with bold and a frame (class `chain-good-is-bottleneck`). A screen reader hears "fehlt" but not "Engpass". The review suggests a hidden "Engpass" word after the good.
- `review-play.md`: with no bakery, the line says only "Engpass: Brot". Under AC5 of job 015 that is correct, because the baker has no missing input. But the player is not told that the bakery is missing.

Rules from `docs/vision.md`:
- Section 2: "Verwaltungsoberfläche (Panels, Tabellen, Kettendiagramm)".
- Section 5: each job works in exactly one building. In code this is `JOB_BUILDING` in `src/sim/jobs.ts`.
- Section 2 and `CLAUDE.md`: German UI text goes in `src/text/de.ts`, and the simulation core stays pure.

## Acceptance criteria

### Heading at 200 % zoom
- AC1: `de.productionChain.heading` contains a soft hyphen (U+00AD) between "Produktions" and "kette", written in the source as `"Produktions­kette"` so it can be seen. At a 180 px viewport the visible heading is either "Produktionskette" on one line or "Produktions-" / "kette" with a hyphen. It never breaks without a hyphen and never breaks at any other point. The heading still reads as "Produktionskette" in the browser, and the section keeps its accessible name through `aria-labelledby` on the `h2`.
- AC2: Nothing else about the heading changes: no new CSS rule for `h2`, no `hyphens: auto`, and no `overflow-wrap: anywhere`. The existing test in `tests/formatProductionChain.test.ts` that checks the heading is updated to the new string, not deleted. `de.productionChain.listLabel` ("Schritte der Produktionskette") stays unchanged. It is an `aria-label` and never wraps on screen.

### Bottleneck good for screen readers
- AC3: Every good in the chain list that is a bottleneck (`ChainGoodCell.bottleneck === true`) has the word "Engpass" in its accessible text, after the "fehlt" word. A screen reader then reads, for example, "Weizen 0 fehlt, Engpass". The word comes from a new string in `de.productionChain` (for example `bottleneckMark: "Engpass"`), not from a literal in `app.ts`. A good that is not a bottleneck has no "Engpass" word in its accessible text. The builder may show the word or hide it visually. If it is hidden, it uses a visually-hidden CSS class (clip pattern), not `display: none` or `aria-hidden`, so screen readers still read it.
- AC4: The mark follows the refresh rules of job 015 (its AC12). The element is built once in `buildChainGood`. `updateChainGood` toggles it only through `hidden` or a class name, together with the existing `chain-good-is-bottleneck` class. Text is set with `textContent`. No live region is added, and the bold frame of `chain-good-is-bottleneck` stays as it is.
- AC5: The goods marked "Engpass" in the list are always the goods named in the bottleneck line, as in AC11 of job 015.

### Missing building as the cause
- AC6: A pure, DOM-free function in `src/sim/`, for example `missingBuildingsFor(state, good): BuildingType[]` in `src/sim/shortages.ts`, returns the buildings whose absence explains a bottleneck. It returns the `JOB_BUILDING` type of every job that produces `good` according to `RECIPES` (`producersOf` in `src/sim/productionChain.ts`), but only when the state has **no** building of that type at all, finished or under construction. If any producer's building exists, finished or under construction, the result is empty. For a good no job produces (today Stein, Eisenerz, Werkzeug), the result is empty too. The result is in `JOBS` order, has no duplicates and never mutates the state.
- AC7: The bottleneck line from `formatProductionChain` names that cause after each bottleneck good that has one, in parentheses: "Engpass: Brot (keine Bäckerei)". With several goods it reads, for example, "Engpass: Wasser (kein Brunnen), Holz (keine Holzfällerhütte)". A good with an empty result from AC6 keeps its bare name, as it does today ("Engpass: Weizen" when a field exists but nobody works on it). The good order stays `GOODS` order. "Kein Engpass" is unchanged.
- AC8: The cause texts live in `src/text/de.ts`. There is one text per building type with the right German article, in a `Record<BuildingType, string>`, so a new building type without a text is a type error: "kein Wohnhaus", "kein Brunnen", "kein Feld", "keine Mühle", "keine Bäckerei", "keine Holzfällerhütte". Building names are not glued together from `buildingTypes` plus a fixed "kein". The line uses no other new strings except the parentheses.
- AC9: Only the bottleneck line names causes. The chain rows, the cells and the `hasBottleneck` flag do not change, and `findShortages` keeps its signature and results.

### Tests and build
- AC10: Unit tests with a fixed seed, in `tests/shortages.test.ts` and `tests/formatProductionChain.test.ts`, cover:
  - the AC6 function: no bakery → `["bakery"]` for Brot; a bakery under construction → empty; a finished bakery with no workers → empty; Stein → empty; the input state is not mutated;
  - the line "Engpass: Brot (keine Bäckerei)" on a hand-made state where residents lack bread and no bakery exists;
  - the two-good case with causes, for example no well and no woodcutter hut;
  - the existing Weizen case of job 015 (a mill exists, no farmer works) still reads "Engpass: Weizen" when a field exists, and reads "Engpass: Weizen (kein Feld)" when no field exists;
  - `de.productionChain.heading` equals `"Produktions­kette"` and its text without the soft hyphen is "Produktionskette";
  - the new "Engpass" mark string exists in `de.productionChain`.
- AC11: `npm test` and `npm run build` pass. No test is deleted, `package.json` gets no new dependencies, and no DOM test library is added. `src/ui/styles.css` keeps one media query and adds no new colors.

## Out of scope
- Naming other causes: a finished building with no workers ("Wunschzahl 0", "kein Bäcker"), too few workers, a building under construction ("Bäckerei im Bau"), or missing stone or wood to order it.
- Buttons or links in the chain that order buildings or change wish numbers.
- Changing the shortage or bottleneck rules of job 015 (AC2 to AC5 there). The initial state still shows "Kein Engpass" even with no well, field or bakery. The play review accepted that.
- Soft hyphens or wrapping fixes for other headings or texts, unless one of them visibly breaks mid-word at 180 px. In that case the builder reports it and does not fix it in this job.
- Showing causes in the chain rows or in the chronicle.

## Notes for the builder
- Files likely touched:
  - `src/text/de.ts`: the heading, the new mark string and the per-building cause record;
  - `src/sim/shortages.ts`: the AC6 function, reusing `producersOf` and `JOB_BUILDING`;
  - `src/ui/formatProductionChain.ts`: the bottleneck line;
  - `src/ui/app.ts`: `buildChainGood`, `updateChainGood` and the `ChainGoodView` interface;
  - `src/ui/styles.css`: a visually-hidden class, only if you choose to hide the word visually;
  - `tests/shortages.test.ts` and `tests/formatProductionChain.test.ts`.
- `tests/formatProductionChain.test.ts` around line 81 splits `bottleneckText` on ", " to compare the line with the marked cells. With causes in the line, that split breaks. Change the check to strip the " (…)" parts, or compare against `findShortages(state).bottlenecks` directly. Keep what the test checks (AC5).
- In `buildChainGood` the "fehlt" span carries its own leading space, so a hidden span leaves no stray space. Do the same for the mark, for example `", Engpass"` or `" Engpass"`. The pattern is already there; copy it.
- A visually-hidden class is the usual pattern: `position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); clip-path: inset(50%); white-space: nowrap;`. Nothing like it exists in `styles.css` yet. Make sure the absolute positioning cannot cause horizontal overflow at 180 px. `.chain-good` is inline, so the nearest positioned ancestor matters. Adding `position: relative` to `.chain-step` is enough.
- Check the heading with `npm run dev` in device mode at 180 px, 360 px and desktop width, and confirm that no other part of the panel overflows (AC13 of job 015 still holds).
- Edge case: in AC6, a house never produces anything, so "kein Wohnhaus" is never shown today. The record still needs it for type safety.
- Assumptions for the orchestrator to confirm:
  - "the building is missing" means no building of that type exists, finished or under construction. A bakery under construction gives no cause text. The player sees it in the Gebäude panel.
  - The cause goes into the existing bottleneck line in parentheses, not into a separate line.
  - The builder chooses whether the "Engpass" mark is visible or visually hidden. Both meet AC3.
