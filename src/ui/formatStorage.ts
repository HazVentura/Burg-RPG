// Turns the castle storage into the rows the storage panel shows.
// Pure and DOM-free so the names, order and rounding can be unit-tested.

import { GOODS, type Good, type Storage } from "../sim/goods";
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
