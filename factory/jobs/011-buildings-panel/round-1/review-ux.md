VERDICT: PASS

## Findings
- [minor] src/ui/app.ts `runOrder`: a second failed order with the same reason sets identical text, so screen readers usually do not announce it again. Fix: clear `orderError.textContent` first and set the text in the next frame, or accept this as is (the missing text beside the button still shows the reason).
- [minor] src/text/de.ts `orderErrors.notEnoughGoods`: "Dafür reichen Holz und Stein im Lager nicht." does not say which building or what to do. Fix: e.g. "Für <Name> reichen Holz und Stein nicht. Warte, bis das Lager voller ist."
- [minor] src/ui/app.ts `buildBuildOptionsView`: the "Es fehlen ..." text is not tied to its button. Fix: give it an id and set `aria-describedby` on the button so screen-reader users hear the reason when focusing "<Name> bauen".
- [minor] src/ui/app.ts: the build-option name is a `span` while list items use `h3`, and "Bauen" is also `h3`. Heading levels are consistent enough, but the name could be omitted from the heading outline; no action required.

## Checked
- Flow: order, state replaced, refresh at once (also while paused), list item appended, counts and Lager updated.
- Failure path: state kept, German reason in the Gebäude `role="alert"`, cleared on the next success; the Bewohner alert is separate.
- Order of elements in the area matches the spec (summary rows, alert, list, Bauen group).
- Progress: native `<progress max="100">` with a name containing the building name, plus percent and "noch ..." as text; the bar hides on finish and the status line takes over.
- Items are keyed by id and updated in place; the buttons are never disabled, so keyboard focus survives ticks and clicks.
- Texts are short, plain German, and use `textContent` only; button text is "<Name> bauen".
- Empty state: initial start shows two houses with beds and all options affordable; unaffordable options show the missing text.
- Layout was not run in a browser; reading the CSS, it uses wrapping grids and the existing button minimum size.
