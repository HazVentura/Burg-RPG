// German medieval given names for residents, and the seeded name picker.
//
// These lists live in the simulation core on purpose, not in src/text/de.ts:
// a name is simulation data that is stored in the game state and in save games,
// and the core must never import from the text layer. They are proper nouns,
// not UI strings to translate.

import type { Random } from "./random";
import type { Sex } from "./residents";

export const GIVEN_NAMES: Readonly<Record<Sex, readonly string[]>> = Object.freeze({
  female: Object.freeze([
    "Adelheid", "Agnes", "Alheit", "Bertha", "Brunhild", "Christina", "Elisabeth",
    "Ermengard", "Gertrud", "Gisela", "Hedwig", "Hildegard", "Hiltrud", "Irmgard",
    "Jutta", "Kunigunde", "Liutgard", "Margarete", "Mathilde", "Mechthild", "Oda",
    "Ottilie", "Richenza", "Sophia", "Richardis", "Walburga", "Wiltrud", "Gerhild",
    "Hadwig", "Irmtrud", "Kriemhild", "Rotraut",
  ]),
  male: Object.freeze([
    "Albrecht", "Arnold", "Berthold", "Burkhard", "Dietrich", "Eberhard", "Eckhart",
    "Friedrich", "Gebhard", "Gottfried", "Gunther", "Hartmann", "Heinrich", "Hermann",
    "Hugo", "Konrad", "Leopold", "Lothar", "Ludwig", "Meinhard", "Otto", "Rudolf",
    "Ruprecht", "Siegfried", "Ulrich", "Volkmar", "Walther", "Wernher", "Wolfram",
    "Wilhelm", "Hildebrand", "Engelbert",
  ]),
});

/**
 * Picks a name for `sex` that is not in `taken`, using exactly one draw from `random`.
 * When every name of the list is taken, it picks from the whole list instead of
 * failing: a duplicate name is harmless because residents are identified by id.
 */
export function pickName(random: Random, sex: Sex, taken: readonly string[]): string {
  const names = GIVEN_NAMES[sex];
  const free = names.filter((name) => !taken.includes(name));
  const candidates = free.length > 0 ? free : names;
  const name = candidates[Math.floor(random.next() * candidates.length)];
  // Unreachable: the index is in [0, candidates.length) and the lists are not empty.
  if (name === undefined) {
    throw new RangeError(`No name available for ${sex}`);
  }
  return name;
}
