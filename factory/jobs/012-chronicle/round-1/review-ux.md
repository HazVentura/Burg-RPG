VERDICT: PASS

## Findings
- [minor] src/ui/app.ts (chronicle list): the scrolling list is a focusable stop (tabindex 0) with an aria-label, which is correct, but it has no role, so some screen readers may not announce it when it takes focus. Fix: optional, add role="region" with the same label, or leave as is.
- [minor] src/ui/formatChronicle.ts: the time line reads "Tag 3, Jahr 1, Frühling, 14:00 Uhr" with the season in the middle, which is slightly long on a phone but it wraps. Fix: none needed.

## Checked
- Flow: a finished building and a good running out each show as a row, newest first, with date, season and time.
- Empty state: "Noch keine Ereignisse." shows while the chronicle is empty, and the list is hidden so there is no empty tab stop.
- Wording: short, plain German, consistent with the other areas; building names match the building list ("Brunnen 1").
- Accessibility: the area is a section labelled by its h2, the list is an ol with an accessible name, and the scrolling list is keyboard reachable with a visible focus outline.
- Live regions: the chronicle is correctly not a live region, so 4x speed does not flood screen readers. The two role="alert" elements are unchanged.
- Updates: rows are added at the top by key, rows dropped by the cap are removed, existing rows are not rebuilt, and text is set via textContent.
- Narrow screens: the time sits above the message so long text wraps, and the list scrolls inside the panel.
