// Balance numbers for buildings. The vision gives no numbers, only that building
// costs wood and stone and takes a fixed time (docs/vision.md, section 6).
// Only mill and bakery cost stone: stone comes from the mine, which needs castle
// level 2, and level 2 needs a mill and a bakery. So their stone cost together
// must fit into the 20 starting stones.

import type { BuildingDefinition, BuildingType } from "./buildings";

function define(definition: BuildingDefinition): Readonly<BuildingDefinition> {
  // Freeze the nested cost too, so no game can change the template for the next one.
  return Object.freeze({ ...definition, cost: Object.freeze({ ...definition.cost }) });
}

export const BUILDING_DEFINITIONS: Readonly<Record<BuildingType, Readonly<BuildingDefinition>>> = Object.freeze({
  house: define({ cost: { wood: 20, stone: 0 }, buildHours: 48, workplaces: 0, beds: 4 }),
  well: define({ cost: { wood: 10, stone: 0 }, buildHours: 24, workplaces: 2, beds: 0 }),
  field: define({ cost: { wood: 5, stone: 0 }, buildHours: 12, workplaces: 4, beds: 0 }),
  mill: define({ cost: { wood: 15, stone: 8 }, buildHours: 72, workplaces: 2, beds: 0 }),
  bakery: define({ cost: { wood: 15, stone: 8 }, buildHours: 72, workplaces: 2, beds: 0 }),
  woodcutterHut: define({ cost: { wood: 10, stone: 0 }, buildHours: 24, workplaces: 2, beds: 0 }),
});

/** docs/vision.md, section 10: a new game starts with 2 finished houses. */
export const START_HOUSES = 2;

export function getBuildingDefinition(type: BuildingType): Readonly<BuildingDefinition> {
  return BUILDING_DEFINITIONS[type];
}
