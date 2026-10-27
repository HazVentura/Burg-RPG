// Display names of buildings, shared by the building list, the chronicle and the
// resident list (Unterkunft). Its own module so formatResidents can use it
// without importing formatBuildings, which already imports formatResidents.

import type { Building, BuildingType } from "../sim/buildings";
import { de } from "../text/de";

/**
 * Display name per building id: type name plus a running number within the
 * type, in list order ("Wohnhaus 1", "Brunnen 2"). Shared by the building list,
 * the chronicle and the resident list, so all name a building the same way. Buildings are
 * never removed, so the running number of a building never changes.
 */
export function buildingDisplayNames(buildings: readonly Building[]): Map<number, string> {
  const countByType = new Map<BuildingType, number>();
  const names = new Map<number, string>();
  for (const building of buildings) {
    const number = (countByType.get(building.type) ?? 0) + 1;
    countByType.set(building.type, number);
    names.set(building.id, `${de.buildingTypes[building.type]} ${number}`);
  }
  return names;
}
