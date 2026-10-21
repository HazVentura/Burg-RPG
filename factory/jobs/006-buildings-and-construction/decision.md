APPROVE

## Why
Round 1 has `VERDICT: PASS` from all four reviewers (code, security, UI, UX), and the open findings are all minor notes for later jobs. I ran it myself in `.worktrees/006-buildings-and-construction`: `npm test` passes 187 of 187 and `npm run build` passes. The branch is based on current `main`. The diff only touches `src/sim/` (three new modules and `state.ts`) and tests. It adds no dependencies and changes nothing in `src/ui/`, `src/main.ts` or `src/text/de.ts`.

## For the human
What gets merged:
- `src/sim/buildings.ts`: `BUILDING_TYPES` (house, well, field, mill, bakery, woodcutterHut), the `Building` and `BuildingDefinition` types, `isFinished` and the pure `advanceConstruction`.
- `src/sim/buildingConstants.ts`: a frozen definitions table (cost in wood and stone, build hours, workplaces, beds) and `START_HOUSES = 2`.
- `src/sim/commands.ts`: the first command, `orderBuilding`. It pays the full cost up front, or returns `{ ok: false, reason: "notEnoughGoods" }`.
- `GameState` gets `buildings` and `nextBuildingId`. A new game starts with 2 free finished houses. `tick` lowers the remaining build hours of every building under construction by 1 each hour, all in parallel.
- The existing tests in `tests/state.test.ts` and `tests/needs.test.ts` were updated for the new state shape, not deleted.

The balance numbers are assumptions; the vision gives none. If they feel wrong once you play, change them in `src/sim/buildingConstants.ts`. Notes for later jobs:
- The building panel should check that a building type is valid, and show which goods are missing when an order fails.
- Save game import (step 7) should check building records when a save is loaded.
