APPROVE

## Why
Round 1 has `VERDICT: PASS` from all four reviewers (code, security, UI, UX), with only minor findings. I ran `npm test` (329 of 329 passed) and `npm run build` (passed) in `.worktrees/011-buildings-panel` myself. The diff matches AC1 to AC14: `src/sim/` changes only for the `isBuildingType` guard, there are no new dependencies, and no unrelated files change. The change only adds UI and is easy to undo.

## For the human
What gets merged: the Gebäude area becomes a working panel.
- A list of buildings ("Wohnhaus 1", "Brunnen 1", ...) shows a native progress bar with percent and remaining time while a building is under construction. Finished work buildings show "x von y Plätzen besetzt", and houses show their beds.
- A "Bauen" group has one entry per building type with cost, build time, what the building offers and what is missing. Its "<Name> bauen" buttons are never disabled. If an order fails, the error appears in a separate `role="alert"` in the Gebäude area.
- `orderBuilding` now returns `unknownBuilding` for values that are not building types.
- New German texts are in `de.buildingTypes` and `de.buildingPanel`.

Before you push `main`, check AC13 with `npm run dev` in device mode: at 360 px width and at 200 % text size nothing should scroll sideways, and the buttons should be at least 44 px. The reviewers checked this only by reading the CSS, not in a browser.

Optional follow-ups from the reviews:
- Tie the "Es fehlen ..." text to its button with `aria-describedby`.
- Make the `notEnoughGoods` message name the building.
- Check building types when a save is loaded, once save/load exists.
