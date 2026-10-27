// Beds (docs/vision.md, sections 6 and 7.1): "Wohnhäuser bieten Betten." Every
// resident sleeps in a bed in a finished house, or is homeless when there are
// too few beds. This module decides where; it only ever changes Resident.homeId.
//
// Passes over state.residents, always in list order and never reordered:
// 1. Clear invalid homes (no such building, not a house, under construction).
// 2. Keep: residents keep their valid home while that house has a free bed.
// 3. Place: residents still without a bed take a free bed in the first house
//    in state.buildings order that has one.
// Age, sex, job and needs do not matter: children get beds like adults.
// Keeping before placing makes the function idempotent: a second run finds
// every resident in a house with room, and nobody left to place.

import { getBuildingDefinition } from "./buildingConstants";
import { isFinished } from "./buildings";
import type { GameState } from "./state";

/**
 * Gives every resident a bed while beds last; the rest are homeless (homeId null).
 * Pure: returns a new state, and a resident whose homeId does not change is the
 * same object as in the input. When nothing changes, returns `state` itself.
 */
export function assignHomes(state: GameState): GameState {
  const bedsPerHouse = getBuildingDefinition("house").beds;
  // Free beds per finished house, in state.buildings order (Map keeps insertion order).
  const freeBeds = new Map<number, number>();
  for (const building of state.buildings) {
    if (building.type === "house" && isFinished(building)) freeBeds.set(building.id, bedsPerHouse);
  }

  // Takes one bed in the house if it has one free; true on success.
  const take = (id: number): boolean => {
    const free = freeBeds.get(id);
    if (free === undefined || free === 0) return false;
    freeBeds.set(id, free - 1);
    return true;
  };

  // Passes 1 and 2: a home is kept only if it is a finished house with a free bed.
  const next: (number | null)[] = state.residents.map((resident) => {
    const id = resident.homeId;
    return id !== null && take(id) ? id : null;
  });

  // Pass 3: the first house in list order with a free bed.
  next.forEach((id, index) => {
    if (id !== null) return;
    for (const houseId of freeBeds.keys()) {
      if (take(houseId)) {
        next[index] = houseId;
        return;
      }
    }
  });

  let changed = false;
  const residents = state.residents.map((resident, index) => {
    const homeId = next[index] ?? null;
    if (homeId === resident.homeId) return resident;
    changed = true;
    return { ...resident, homeId };
  });
  return changed ? { ...state, residents } : state;
}
