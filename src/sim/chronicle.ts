// The chronicle (Chronik): notable events recorded by tick, newest first.
// Entries are structured plain JSON data, never German sentences, so the state
// stays serializable and all wording stays in src/text/de.ts.

import type { Building, BuildingType } from "./buildings";
import { isFinished } from "./buildings";
import { CHRONICLE_MAX_ENTRIES } from "./chronicleConstants";
import { GOODS, type Good, type Storage } from "./goods";

/** One chronicle entry. `hour` is the elapsedHours at which the event became visible. */
export type ChronicleEntry =
  | { kind: "buildingFinished"; hour: number; buildingId: number; buildingType: BuildingType }
  | { kind: "goodRanOut"; hour: number; good: Good };

export type ChronicleKind = ChronicleEntry["kind"];

/** The parts of a state that the chronicle compares between the start and the end of a tick. */
export interface ChronicleSnapshot {
  buildings: readonly Building[];
  storage: Readonly<Storage>;
}

/**
 * The events of one tick, found by comparing its start with its end. Only these
 * two moments count, so a good that touches 0 and is refilled within the same
 * tick gives no entry. Order: finished buildings in list order, then goods
 * that ran out in GOODS order.
 */
export function detectEvents(start: ChronicleSnapshot, end: ChronicleSnapshot, hour: number): ChronicleEntry[] {
  const entries: ChronicleEntry[] = [];

  // Buildings keep their ids and are never removed, so a lookup by id is safe.
  const startById = new Map(start.buildings.map((building) => [building.id, building]));
  for (const building of end.buildings) {
    const before = startById.get(building.id);
    if (before !== undefined && !isFinished(before) && isFinished(building)) {
      entries.push({ kind: "buildingFinished", hour, buildingId: building.id, buildingType: building.type });
    }
  }

  // Amounts are multiples of 1/8, so the strict comparison with 0 is exact.
  for (const good of GOODS) {
    if (start.storage[good] > 0 && end.storage[good] === 0) {
      entries.push({ kind: "goodRanOut", hour, good });
    }
  }

  return entries;
}

/**
 * Puts the new entries in front of the chronicle and drops the oldest ones
 * beyond CHRONICLE_MAX_ENTRIES. Returns the same array when nothing is new.
 */
export function prependEntries(chronicle: ChronicleEntry[], entries: readonly ChronicleEntry[]): ChronicleEntry[] {
  if (entries.length === 0 && chronicle.length <= CHRONICLE_MAX_ENTRIES) {
    return chronicle;
  }
  return [...entries, ...chronicle].slice(0, CHRONICLE_MAX_ENTRIES);
}
