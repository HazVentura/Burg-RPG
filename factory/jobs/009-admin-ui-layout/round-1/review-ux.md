VERDICT: PASS

## Findings
- [minor] src/ui/app.ts (clock section inside header): the clock is a `<section>` with `aria-label` inside `<header>`, so screen readers list it as a fourth region next to the three areas. Fix: optional; keep it, since the label is clear and matches the spec.
- [minor] Build note: layout (AC10, AC11, AC13) was checked by reading the CSS only, not in a browser. Fix: the human should check 360 px, 768 px and 200 % text size once in device mode.

## Checked
- Structure: header (h1 + clock) then main with Lager, Bewohner, Gebäude in order. Each is a section with a visible h2 and `aria-labelledby`. Heading levels h1 then h2, none skipped.
- Content: Bewohner "Anzahl" shows the resident count. Gebäude shows "Fertig" and "Im Bau", and zero is shown. Storage content is unchanged.
- Focus and status: all views are built once and refresh only sets `textContent` and `aria-pressed`, so focus stays while time runs. No `aria-live`, no `innerHTML`.
- Wording: short German labels in `de.ts`, consistent with the existing page. The tagline was removed with no dangling reference.
- Empty and edge states: the rows have a fixed shape, so nothing jumps. No error states are needed for count displays.
- Keyboard: the buttons and their order are unchanged, with native button semantics.
