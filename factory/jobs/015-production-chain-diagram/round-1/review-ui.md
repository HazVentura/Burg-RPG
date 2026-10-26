VERDICT: PASS

## Findings
- [minor] src/ui/styles.css: `.chain-good-is-bottleneck` border (#8a7a62) is the same as the other frames, but a 2px border on a small inline span has low non-text contrast on a light background. The bold weight and the visible "fehlt" word carry the meaning, so it is not a blocker. Fix: optionally use a darker existing border color if one exists in the palette.

## Checked
- All colors (#5a4c38, #1f1a14, #e4d9c4, #8a7a62) already appear in the project; no new colors, sizes follow existing rem values.
- Panel uses buildPanel and the existing heading pattern; spacing and hierarchy match other areas.
- Missing goods are marked with visible text, not color alone; bottleneck line and marks come from the same data.
- Text contrast uses the existing dark-brown text colors on the light panel; AA is fine.
- No interactive elements are added, so no focus state is needed.
- Layout: flex-wrap with min-width: 0 and gap, so steps wrap at 360px and narrower; no new media query.
- Arrows are aria-hidden; no live region added.
