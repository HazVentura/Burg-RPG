VERDICT: PASS

## Findings
- [minor] src/ui/app.ts (buildChainGood): a bottleneck good is marked only by bold and a frame, so a screen reader hears "fehlt" but not which missing good is the root. Fix: none needed, since the "Engpass: ..." line names the same goods and comes first; optionally add a visually hidden "Engpass" word after the good.
- [minor] src/ui/formatProductionChain.ts: a job with no workers reads "0 bei der Arbeit". Wording is correct and consistent; no change needed unless the player should be told why (out of scope per spec).

## Checked
- Area placed right after Lager as a section labelled by its own h2; bottleneck line first, then an ol with an accessible name.
- Each step reads inputs, job with worker count, outputs; arrows are aria-hidden; steps without inputs or outputs get no dangling arrow.
- Missing goods carry the visible word "fehlt", not color alone; "Kein Engpass" is shown when nothing is missing, "Engpass: A, B" for several.
- Residents' row (Bewohner, essen und trinken) with Brot and Wasser; unused goods are absent.
- No live region added, so 4x ticks will not flood screen readers; refresh only changes textContent, hidden and class names, so focus elsewhere is unaffected.
- All strings are in de.ts, short and plain German.
- Layout uses flex-wrap with min-width 0 and no new media query, so narrow widths should wrap rather than scroll.
