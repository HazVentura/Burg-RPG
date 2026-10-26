VERDICT: PASS

## Findings
- [minor] src/ui/styles.css `.job-target-stepper`: at 180 px the control stacks into three lines ("–", "Wunsch N", "+"), so a row gets tall and the value sits between two buttons vertically. Fix: optional; accept, since the spec allows top-to-bottom wrapping and reading order is kept.

## Checked
- AC1/AC2: flex-wrap plus min(4.5rem,100%) lets "+" stay inside the panel at 180 px; build reports scrollWidth equal to the viewport.
- AC3/AC4: at 360 px and desktop the row fits and does not wrap; order "–", value, "+" unchanged; buttons stay 44 px; app.ts untouched so DOM order and aria-labels are unchanged.
- AC5: CSS only, one media query, no new colors.
- AC6/AC7/AC8: each fixture has one correct doc comment; no test logic changed.
