# Build: 005-food-and-drink

## Round 1
- What changed:
  - `src/sim/needConstants.ts` (new): NEED_MIN, NEED_MAX, BREAD/WATER_PER_RESIDENT_PER_DAY, NEED_DROP_PER_DAY_WITHOUT.
  - `src/sim/needs.ts` (new): `Needs` type, `createFullNeeds()`, pure `consumeDailyFood(residents, storage)` with a per-good serving order (lowest need first, explicit index tie-break).
  - `src/sim/residents.ts`: `Resident.needs` field; settlers get full needs without any random draw.
  - `src/sim/state.ts`: `tick` advances the hour, then runs `consumeDailyFood` when the new hour is a multiple of `HOURS_PER_DAY`.
  - `tests/needs.test.ts` (new): covers AC2 to AC12.
  - `tests/residents.test.ts`, `tests/state.test.ts`, `tests/storage.test.ts`: updated (not deleted) for the new behaviour (see AC13).
- AC1: `src/sim/needs.ts` (`Needs`), `src/sim/residents.ts` (`needs: Needs`); tests "has exactly these fields on every resident" (residents.test.ts), "adds no top-level field to GameState" (needs.test.ts).
- AC2: needs.test.ts "gives every settler full bread and water, and no other need", "gives each resident its own needs object", "keeps rngState, names, ages and partners exactly as before needs existed" (values recorded from main a425844 for seeds 42, 0, -1); draw-order test in residents.test.ts still passes.
- AC3: needs.test.ts "changes nothing in the first 23 ticks", "consumes one day on tick 24", "changes nothing on ticks 25 to 47", "consumes exactly 40 days in one year".
- AC4: "feeds everyone when there is enough and changes no other good", "handles bread and water independently".
- AC5: "never splits a ration or goes below 0" (0.5 bread stays 0.5), "serves the lowest need first when one ration is left for two" (storage ends at 0).
- AC6: "serves list order on ties: 3 bread for 8 full residents", "serves the lowest need first when one ration is left for two" (order per good). Implementation sorts an index copy with `needA - needB || a - b`.
- AC7: "drops an unfed need by 25 a day down to 0 and keeps it there", "clamps at NEED_MIN when a need is below the drop", fed-from-25/0 case in "feeds everyone...".
- AC8: describe "start values outcome" (120, 144, 192 ticks), numbers pinned.
- AC9: "leaves the storage unchanged for an empty resident list" (direct and via tick), "applies to a hand-made single resident at midnight", mixed-need cases above.
- AC10: "never mutates the input over 960 ticks, consumption ticks included" (also rngState, nextResidentId), "does not mutate its inputs", "gives deep-equal results for the same state on a consumption tick".
- AC11: "survives a JSON round trip with needs in range" (0, 24, 120, 960 ticks; needs and storage finite and in range).
- AC12: constants only in `src/sim/needConstants.ts`; "need constants / has the agreed values"; tests use the constants except the AC8 block.
- AC13: storage.test.ts "leaves the storage unchanged over 960 ticks, except bread and water" (every other good checked); residents.test.ts "leaves residents, nextResidentId and rngState unchanged over 960 ticks" now compares residents without `needs`; state.test.ts exact-shape `toEqual` after 960 ticks now expects bread/water 0 and all needs 0. No new dependencies.
- AC14: no changes in `src/ui/`, `src/main.ts`, `src/text/de.ts` (`git diff --stat a425844` lists only src/sim and tests).
- Test run: `npm test`, 150 tests in 10 files, all passing. `npm run build` passes.
- Assumptions taken from the spec as written: 1 bread and 1 water per resident per day; consumption on the tick into hour 0 (first at tick 24); a fed need jumps to 100; drop 25 per day; neediest first, then list order.
