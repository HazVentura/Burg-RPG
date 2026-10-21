// Building types, the Building record stored in GameState, and the pure
// construction step that tick runs every hour. Later jobs (production, jobs,
// housing, castle levels) read this list, so its shape is settled here.

/**
 * Every building type that can be built. Mine and smithy come later with
 * castle level 2 (docs/vision.md, sections 5 and 8).
 */
export const BUILDING_TYPES = ["house", "well", "field", "mill", "bakery", "woodcutterHut"] as const;

export type BuildingType = (typeof BUILDING_TYPES)[number];

/** Fixed numbers of one building type. Houses offer beds, work buildings offer workplaces. */
export interface BuildingDefinition {
  cost: Readonly<{ wood: number; stone: number }>;
  /** Game hours (ticks) from order to finished building. */
  buildHours: number;
  workplaces: number;
  beds: number;
}

/** One building, finished or under construction. Plain data so GameState stays JSON. */
export interface Building {
  /** Positive integer, unique within a game and never reused. */
  id: number;
  type: BuildingType;
  /** Build hours still missing; 0 means finished. */
  hoursLeft: number;
}

export function isFinished(building: Building): boolean {
  return building.hoursLeft === 0;
}

/**
 * One hour of construction: every unfinished building gets 1 hour closer to
 * done, all in parallel, since there is no builder who works on one at a time.
 * Returns a new array; finished buildings are shared, never mutated.
 */
export function advanceConstruction(buildings: readonly Building[]): Building[] {
  return buildings.map((building) =>
    isFinished(building) ? building : { ...building, hoursLeft: Math.max(0, building.hoursLeft - 1) },
  );
}
