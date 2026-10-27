VERDICT: PASS

## Findings
- [minor] src/ui/app.ts buildChainGood: the "Engpass" mark is created without `hidden`, so it relies on updateChainGood running right after the first build. This is the same pattern as the "fehlt" span and works if the first refresh runs on load. Fix: optional, set `bottleneckMark.hidden = !cell.bottleneck` in buildChainGood too.
- [minor] Bottleneck line: with several causes in one good the text reads "Brot (keine Mühle, keine Bäckerei)". Today each good has one producer building, so this does not occur. No fix needed.

## Checked
- Heading uses U+00AD between "Produktions" and "kette"; aria-labelledby on the h2 is unchanged and the name still reads "Produktionskette".
- Screen reader text for a bottleneck good reads "Weizen 0 fehlt, Engpass". The word comes from de.ts and uses a clip-pattern visually-hidden class, not display:none or aria-hidden.
- The mark is toggled only through `hidden`, together with the existing frame class. No live region was added.
- The bottleneck line names the cause in plain German ("Engpass: Brot (keine Bäckerei)"). The article forms come from a typed Record. A bare name remains when a building exists, and "Kein Engpass" is unchanged.
- Under-construction buildings give no cause, as the spec says.
- `.chain-step` has position:relative, so the hidden marks cannot cause horizontal overflow.
