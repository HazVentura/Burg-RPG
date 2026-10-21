VERDICT: PASS

## Findings
- [minor] whole feature: no player-visible change by design (spec AC21). Production only becomes visible once "Berufszuteilung" and the UI items land. Fix: none now; make sure those items show water/bread/wood changes and idle workers with a reason (for example missing input) so the player learns why a worker does nothing.

## Checked
- Diff touches nothing in src/ui, src/main.ts or src/text/de.ts, so the page behaves exactly as before (AC21).
- New games start with workplaceId null, so no resident works and the visible storage and needs are unchanged.
- Invalid workplace links (unknown id, house, building under construction) are ignored without errors, so no broken state can reach the player.
- No new strings, errors, or keyboard/ARIA surfaces are introduced.
