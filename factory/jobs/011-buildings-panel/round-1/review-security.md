VERDICT: PASS

## Findings
- [minor] src/ui/formatBuildings.ts:139 (`formatBuildingList`): `getBuildingDefinition(building.type)` and `de.buildingTypes[building.type]` trust `state.buildings[].type`. Today state only comes from the sim, so nothing is exploitable. Once a save import or `localStorage` load exists, an unknown type would make the whole render throw. Fix (in the future save/load job, not here): check building types with `isBuildingType` when deserializing state.

## Checked
- Untrusted input: `orderBuilding` now rejects any non-`BUILDING_TYPES` value at runtime via `isBuildingType`, which uses `Array.includes` (no prototype-key lookup such as `in`/`hasOwnProperty` on an object map). Button types come from a closure, not from DOM attributes. No save import or `localStorage` is touched.
- Output escaping: every new text is set with `textContent` or `setAttribute("aria-label", ...)`. No `innerHTML`, `insertAdjacentHTML` or `outerHTML` was added. All strings come from `de.ts` and numbers in state.
- Links/URLs: the change builds no links or URLs.
- Resource use: one building costs Holz/Stein, so the number of building list items is limited by the economy. The `Map` of row views only grows when a building is added. `formatBuildingList` is O(buildings x residents) per refresh, which is fine at the current scale. The order handler is synchronous and reads current `state`, so it cannot race with the tick.
- Division: `buildHours` comes from the constants (all > 0), so the progress percent cannot divide by zero.
- Secrets/debug: the diff adds no `console.*`, `debugger`, secrets or TODO leftovers.
- Tests: `npx vitest run` in the worktree passes 329 of 329.
