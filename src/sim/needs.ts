// Daily needs (docs/vision.md, sections 5 and 7.1): every resident eats one
// bread and drinks one water from the castle storage, and Wohnraum follows
// whether the resident has a bed.
//
// The food need keys are the same as the good names on purpose, so one loop
// over CONSUMED_GOODS handles bread and water alike. Housing takes no goods,
// so it has its own function instead.

import type { Storage } from "./goods";
import {
  BREAD_PER_RESIDENT_PER_DAY,
  HOUSING_DROP_PER_DAY_WITHOUT,
  NEED_DROP_PER_DAY_WITHOUT,
  NEED_MAX,
  NEED_MIN,
  WATER_PER_RESIDENT_PER_DAY,
} from "./needConstants";
import type { Resident } from "./residents";

/** Per-resident supply values, each from NEED_MIN to NEED_MAX. */
export interface Needs {
  bread: number;
  water: number;
  /** Wohnraum: refilled each midnight with a bed, dropping without one. */
  housing: number;
}

/** Goods consumed daily, in GOODS order; each one is also the key of its need. */
export const CONSUMED_GOODS = ["bread", "water"] as const satisfies readonly (keyof Needs & keyof Storage)[];

export type ConsumedGood = (typeof CONSUMED_GOODS)[number];

/** Amount of each consumed good one resident takes per day. */
export const RATION_PER_DAY: Readonly<Record<ConsumedGood, number>> = Object.freeze({
  bread: BREAD_PER_RESIDENT_PER_DAY,
  water: WATER_PER_RESIDENT_PER_DAY,
});

/** Needs of a well-supplied resident, as a fresh object. */
export function createFullNeeds(): Needs {
  return { bread: NEED_MAX, water: NEED_MAX, housing: NEED_MAX };
}

export interface DailyConsumption {
  residents: Resident[];
  storage: Storage;
}

/**
 * One day of eating and drinking. Returns new residents, needs and storage;
 * the inputs are never mutated. When a good runs short, the residents with the
 * lowest value of that need are served first, ties in list order.
 */
export function consumeDailyFood(residents: readonly Resident[], storage: Readonly<Storage>): DailyConsumption {
  const nextStorage: Storage = { ...storage };
  const nextNeeds: Needs[] = residents.map((resident) => ({ ...resident.needs }));

  for (const good of CONSUMED_GOODS) {
    const ration = RATION_PER_DAY[good];
    for (const index of servingOrder(residents, good)) {
      const needs = nextNeeds[index];
      if (needs === undefined) continue;
      if (nextStorage[good] >= ration) {
        nextStorage[good] -= ration;
        needs[good] = NEED_MAX;
      } else {
        needs[good] = Math.max(NEED_MIN, needs[good] - NEED_DROP_PER_DAY_WITHOUT);
      }
    }
  }

  return {
    residents: residents.map((resident, index) => ({
      ...resident,
      needs: nextNeeds[index] ?? { ...resident.needs },
    })),
    storage: nextStorage,
  };
}

/**
 * One night of Wohnraum: with a bed (homeId not null) the need becomes full,
 * without one it drops by HOUSING_DROP_PER_DAY_WITHOUT, never below NEED_MIN.
 * Returns new residents; the input is never mutated.
 */
export function updateHousingNeed(residents: readonly Resident[]): Resident[] {
  return residents.map((resident) => {
    const housing =
      resident.homeId !== null
        ? NEED_MAX
        : Math.max(NEED_MIN, resident.needs.housing - HOUSING_DROP_PER_DAY_WITHOUT);
    return { ...resident, needs: { ...resident.needs, housing } };
  });
}

/** Indices into `residents`, neediest first; equal needs keep list order. */
function servingOrder(residents: readonly Resident[], need: keyof Needs): number[] {
  const indices = residents.map((_, index) => index);
  // The index comparison is the explicit tie-break, so the order does not rely on sort stability.
  return indices.sort((a, b) => {
    const needA = residents[a]?.needs[need] ?? NEED_MAX;
    const needB = residents[b]?.needs[need] ?? NEED_MAX;
    return needA - needB || a - b;
  });
}
