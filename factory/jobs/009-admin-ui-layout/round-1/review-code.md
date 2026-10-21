VERDICT: PASS

## Findings
- [minor] AC10, AC11 and AC13 (responsive layout) were verified by reading the CSS only, as build.md admits. The CSS reads correctly: one column below 48rem, a single media query, `--page-max-width: 72rem`, `min-width: 0`, and `min()` column minimums. A human should still check it in device mode at 360 px and at 200 % text.
- [minor] `updateSummaryView` and `updateStorageView` silently skip a missing element (`!== undefined`). The row count is fixed by the formatters, so this is harmless, but it hides a row-count mismatch.
- [minor] The `.clock` panel inside the header has `flex: 1 1 auto`. On wide screens it stretches to fill the row, which is acceptable.

All other acceptance criteria are met. Header and main are separate, and the three areas have h2 headings and `aria-labelledby`. Everything is built once, with updates through `textContent` only. There is no `aria-live`, no `innerHTML`, and `src/sim` is untouched. Strings live in `de.ts`. `tests/formatSummary.test.ts` covers the initial state, a building under construction, and the finished building, with a fixed seed. There are no new dependencies.

## Tests
`npm test` (in .worktrees/009-admin-ui-layout): 279 tests, all passed
