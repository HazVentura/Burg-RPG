VERDICT: PASS

## Findings
- [minor] Storage panel (unchanged, by AC14): bread and water silently fall to 0 and nothing tells the player why or that residents now go hungry. Fix: covered by the planned Chronik and need-bar backlog items; no change in this job.
- [minor] Gameplay: with no production, water hits 0 on day 6 and the player has no action available. Fix: accepted in the spec as out of scope; make sure the production job follows soon.

## Checked
- AC14 holds: the diff touches only src/sim and tests, so no UI, wording or accessibility regressions are possible.
- The visible flow matches the spec: Brot and Wasser in the existing storage panel drop by 8 at each midnight, and Wasser shows 0 from day 6.
- Edge states (empty residents, 0 storage, partial rations) cannot show negative or fractional amounts in the panel.
