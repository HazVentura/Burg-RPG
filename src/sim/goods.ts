// The eight goods of the castle economy (docs/vision.md, section 5) and the
// shape of the central castle storage. Production, consumption and building
// costs all read and write a Storage, so the goods list is settled here once.

/** Every good in the game. The order is also the display order of the storage panel. */
export const GOODS = ["wheat", "flour", "bread", "water", "wood", "stone", "ironOre", "tools"] as const;

export type Good = (typeof GOODS)[number];

/** Stock of every good in the castle storage. Keyed by Good, so no good can be missing. */
export type Storage = Record<Good, number>;
