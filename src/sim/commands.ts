// Player commands: pure functions GameState -> result. The UI sends these and
// never changes state itself. A command that can fail returns a discriminated
// union, so callers must check ok before they use the new state.

import { getBuildingDefinition } from "./buildingConstants";
import type { BuildingType } from "./buildings";
import type { GameState } from "./state";

export type OrderResult = { ok: true; state: GameState } | { ok: false; reason: "notEnoughGoods" };

/**
 * Orders a new building. The full cost is paid at once from storage; tick
 * finishes the building after its build time. Never mutates state.
 */
export function orderBuilding(state: GameState, type: BuildingType): OrderResult {
  const { cost, buildHours } = getBuildingDefinition(type);
  const { storage } = state;
  if (storage.wood < cost.wood || storage.stone < cost.stone) {
    return { ok: false, reason: "notEnoughGoods" };
  }
  return {
    ok: true,
    state: {
      ...state,
      storage: { ...storage, wood: storage.wood - cost.wood, stone: storage.stone - cost.stone },
      buildings: [...state.buildings, { id: state.nextBuildingId, type, hoursLeft: buildHours }],
      nextBuildingId: state.nextBuildingId + 1,
    },
  };
}
