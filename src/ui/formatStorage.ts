// Turns the castle storage into the rows the storage panel shows.
// Pure and DOM-free so the names, order and rounding can be unit-tested.

import { isFinished } from "../sim/buildings";
import { getCalendarAt } from "../sim/calendar";
import { GOODS, type Good, type Storage } from "../sim/goods";
import type { GameState } from "../sim/state";
import { de } from "../text/de";

export interface StorageRow {
  good: Good;
  name: string;
  amount: string;
}

export function formatStorage(storage: Storage): StorageRow[] {
  return GOODS.map((good) => ({
    good,
    name: de.goods[good],
    // Rounded down so a fractional stock such as 0.5 never looks like 1 available unit.
    amount: String(Math.floor(storage[good])),
  }));
}

/**
 * The line about the wheat on the fields, for example "Auf den Feldern: 120 Weizen, wächst",
 * or null while no finished field exists. The phase is the season of the coming
 * tick, the one the farmers work in next (the season of state.elapsedHours).
 */
export function formatFieldWheat(state: GameState): string | null {
  if (!state.buildings.some((building) => building.type === "field" && isFinished(building))) return null;
  const season = getCalendarAt(state.elapsedHours).season;
  // Rounded down like the storage rows.
  const amount = Math.floor(state.fieldWheat);
  return `${de.storage.fieldsPrefix}: ${amount} ${de.goods.wheat}, ${de.storage.fieldPhases[season]}`;
}
