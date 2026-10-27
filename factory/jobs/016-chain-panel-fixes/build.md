# Build: 016-chain-panel-fixes

## Round 1
- What changed:
  - `src/sim/shortages.ts`: new pure `missingBuildingsFor(state, good): BuildingType[]` (reuses `producersOf` and `JOB_BUILDING`).
  - `src/text/de.ts`: heading `"Produktions­kette"`; new `productionChain.bottleneckMark: "Engpass"`; new `productionChain.missingBuilding: Record<BuildingType, string>` with the six cause texts.
  - `src/ui/formatProductionChain.ts`: the bottleneck line adds " (cause)" after each bottleneck good that has a missing building.
  - `src/ui/app.ts`: `ChainGoodView.bottleneckMark`; `buildChainGood` builds a visually hidden span with `", Engpass"` once; `updateChainGood` toggles it through `hidden` next to the `chain-good-is-bottleneck` class.
  - `src/ui/styles.css`: `.visually-hidden` (clip pattern) and `position: relative` on `.chain-step` so the hidden span cannot overflow. The file still has one media query and no new colors.
  - `tests/chainFixtures.ts`: fixtures `wheatWithFieldState` and `noBakeryState`.
  - `tests/shortages.test.ts`, `tests/formatProductionChain.test.ts`: new and updated tests.
- AC1: `src/text/de.ts:121`; tested by "lets the heading break only at the soft hyphen and still read as Produktionskette (AC1)". The heading still goes through `buildPanel` with the `aria-labelledby` `h2`. The source uses the `­` escape. A literal U+00AD (as in the spec's markdown) is invisible in an editor, and the spec asks for it to "be seen". The runtime string is identical. I did not check it visually at 180 px: this machine has no headless browser (no chromium or playwright). Please check it in the play review.
- AC2: no h2 CSS, `hyphens` or `overflow-wrap` changes. The existing heading assertion in "has the area heading and every new string" is updated, not deleted. `listLabel` is unchanged, tested by "keeps the list label unchanged (AC2)".
- AC3: `src/ui/app.ts:734-737` (`.visually-hidden` span `", Engpass"` after "fehlt", text from `de.productionChain.bottleneckMark`); the string is tested by "has the Engpass mark for screen readers (AC3)". No DOM test (no DOM library allowed).
- AC4: built once in `buildChainGood`, toggled with `hidden` at `src/ui/app.ts:758`, text set with `textContent`, no live region, `.chain-good-is-bottleneck` unchanged.
- AC5: the mark uses the same `cell.bottleneck` flag as the frame. The test "marks exactly the goods named in the bottleneck line" strips the " (…)" causes and also compares with `findShortages(state).bottlenecks`. It now covers five states, including the new fixtures.
- AC6: `src/sim/shortages.ts` `missingBuildingsFor`; tests in `describe("missingBuildingsFor (job 016, AC6)")`: no bakery → `["bakery"]`, under construction → empty, finished with no workers → empty, Stein/Eisenerz/Werkzeug → empty, JOBS order without duplicates, no mutation.
- AC7: tests "names the missing bakery as the cause of a bread bottleneck" ("Engpass: Brot (keine Bäckerei)"), "names several bottlenecks in GOODS order" ("Engpass: Wasser (kein Brunnen), Holz (keine Holzfällerhütte)"), "marks the wheat chain…" ("Engpass: Weizen (kein Feld)"), "keeps the bare good name when its building exists…" ("Engpass: Weizen"), "names no cause for a bakery under construction".
- AC8: `de.productionChain.missingBuilding` is a `Record<BuildingType, string>`; tested by "has one cause text per building type with its article (AC8)". If a good ever had several missing building types, they would be joined with the existing ", " separator inside the parentheses. This cannot happen today.
- AC9: only `bottleneckText` changes; rows, cells and `hasBottleneck` stay the same, and `findShortages` is untouched (its tests are unchanged and pass). Tested by "leaves the rows unchanged by the causes (job 016, AC9)".
- AC10: covered by the tests above (fixed `SEED` and hand-made states).
- AC11: `npm test` and `npm run build` pass. No tests deleted, no new dependencies, one `@media` in `styles.css`, no new colors.
- Test run: `npm test`, 424 tests, all passing; `npm run build` OK.
