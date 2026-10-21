// Storage start values from docs/vision.md, section 10 "Startzustand":
// "Lager mit 60 Brot, 40 Wasser, 50 Holz, 20 Stein."
// Typed as Storage so a missing good is a type error; frozen so a game can
// never change the template for the next game by accident.

import type { Storage } from "./goods";

export const INITIAL_STORAGE: Readonly<Storage> = Object.freeze({
  wheat: 0,
  flour: 0,
  bread: 60,
  water: 40,
  wood: 50,
  stone: 20,
  ironOre: 0,
  tools: 0,
});
