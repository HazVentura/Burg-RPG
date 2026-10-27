// Storage start values from docs/vision.md, section 10 "Startzustand":
// "Lager mit 60 Brot, 40 Wasser, 80 Weizen, 50 Holz, 20 Stein."
// Typed as Storage so a missing good is a type error; frozen so a game can
// never change the template for the next game by accident.
//
// Why 80 wheat: wheat only reaches storage with the first autumn harvest, from
// day 21 (hour 480) on. Without starting wheat the 60 bread runs out at the
// day-8 midnight and the settlers go hungry from hour 192. 80 wheat keeps the
// miller and baker going until the harvest, with 60 bread left at hour 480 and
// at least 12 bread at every hour even when the first orders come at hour 48.
// The first version of section 10 named no wheat; the 80 is a deviation from it
// under the vision's balancing clause ("Zahlen sind Startwerte zum
// Ausbalancieren, keine festen Gesetze"), and section 10 has since been updated to list it.

import type { Storage } from "./goods";

export const INITIAL_STORAGE: Readonly<Storage> = Object.freeze({
  wheat: 80,
  flour: 0,
  bread: 60,
  water: 40,
  wood: 50,
  stone: 20,
  ironOre: 0,
  tools: 0,
});
