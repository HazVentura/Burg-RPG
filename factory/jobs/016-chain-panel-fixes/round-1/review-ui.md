VERDICT: PASS

## Findings
- [minor] src/ui/styles.css: soft hyphen at 180 px was not checked visually by the builder (no headless browser). Fix: confirm in the play review that the heading shows "Produktions-" / "kette" or one line.

## Checked
- New `.visually-hidden` uses the standard clip pattern, adds no colors and no media query; `hidden` still works because the class sets no `display`.
- `position: relative` on `.chain-step` anchors the hidden span, so no horizontal overflow at 360 px.
- Bottleneck frame and bold styling unchanged; no layout or hierarchy change for sighted users.
- Bottleneck line is longer with causes but is normal wrapping text; no new elements or one-off sizes.
- Heading change is text only (soft hyphen), no new h2 CSS, no `hyphens` or `overflow-wrap` rules.
- Focus states: no new interactive elements.
