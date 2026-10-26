# Spielbarer Start (playable start)

## Goal
A new game starts with sensible wish numbers (Wunschzahlen), so every work building the player orders is staffed as soon as it is finished, with no extra clicks. Tests also play the opening the way a real player would and show that the starting goods are enough to build and staff a well and a bakery before water and bread run out.

Rules and numbers from `docs/vision.md`:
- Section 10: "Frühling, Tag 1. 4 Paare (8 Erwachsene), 2 Wohnhäuser, Lager mit 60 Brot, 40 Wasser, 50 Holz, 20 Stein." These stay exactly as they are. The game still starts with no work buildings.
- Section 7.3: "Du setzt Wunschzahlen pro Beruf, das Spiel verteilt freie Erwachsene."
- Section 5: all residents eat bread and drink water. The baker needs flour, water and wood.

How the game works today, which explains the problem:
- `createInitialState` sets every wish number to 0 (job 008, AC1). A player who orders a well sees it finish, and then nobody works in it until they find the wish number controls.
- 8 residents drink 8 water a day (`WATER_PER_RESIDENT_PER_DAY = 1`), so the 40 water is used up at the midnight of day 5 (hour 120). On day 6 (hour 144) the water need starts to drop. The 60 bread lasts until the midnight of day 8 (hour 192), when only 4 are left for 8 residents.

## Acceptance criteria

### Start wish numbers
- AC1: A new constant `START_JOB_TARGETS: Readonly<Record<Job, number>>` lives in one balance module for jobs (for example a new `src/sim/jobConstants.ts`). It is frozen and has one key per entry of `JOBS`, nothing else. Its values are:
  - waterCarrier 2, farmer 2, miller 1, baker 1, woodcutter 2.
  - They add up to 8, the number of starting adults. A comment gives the reason, worked out from `RECIPES` with every worker at 0.5 output per hour (12 a day):
    - 2 water carriers make 24 water a day. That covers 8 for drinking and 6 for the baker.
    - 1 baker makes 12 bread a day, which covers the 8 eaten.
    - 1 miller makes the 12 flour a day the baker's 6 needs.
    - 2 farmers make 24 wheat a day, which covers the miller's 12.
    - 2 woodcutters make 24 wood a day. That covers the baker's 3 and leaves wood for building.
- AC2: `createInitialState(seed)` sets `jobTargets` to a fresh copy of `START_JOB_TARGETS`, for every seed. Two games never share the object, and changing one game's `jobTargets` never changes the constant or another game. Nothing else in the initial state changes:
  - storage is still 60 bread, 40 water, 50 wood and 20 stone (all other goods 0);
  - there are still 2 finished houses and no other buildings;
  - every resident still has `workplaceId: null` and `pinnedJob: null`;
  - `rngState`, names, ages and partners are the same as before for every seed.
- AC3: Without any player action, the behavior stays as it is today apart from the wish numbers. There are no work buildings, so nobody works. After 5 × 24 ticks water is 0, and on the day-6 midnight (tick 144) every resident's water need is below 100. A test shows this, so the reason a player has to act stays visible.
- AC4: The start wish numbers act like numbers the player has set. Example: initial state, then `orderBuilding(state, "well")`. Nobody works during the 24 build hours. After tick 24, residents 1 and 2 (the first two adults in list order) have the well as their workplace, without any `setJobTarget` call. On tick 25 water rises by 1 (2 × 0.5) before any drinking. The player can still change every wish number with `setJobTarget` as before, down to 0.

### The opening is winnable (scenario tests, fixed seed)
- AC5: Opening on day 1. Start from `createInitialState(SEED)`. At hour 0, order well, field, woodcutter hut and mill in that order. This uses 40 wood and 8 stone, leaving 10 wood and 12 stone. Then tick hour by hour. In the first hour when `storage.wood >= 15`, order the bakery (expected around hour 29, after the woodcutters have worked about 5 hours). After that, only tick, up to day 20 (480 ticks). There are no `setJobTarget` or `setPinnedJob` calls. The test asserts:
  - every `orderBuilding` call returns `ok: true`;
  - by tick 480, every resident's bread and water need is still 100 after every midnight;
  - the chronicle never has an "ausgegangen" (ran out) entry for bread or water;
  - when the bakery is finished, the well has 2 workers and the bakery has 1. These are the workers of the start wish numbers, with no player change.
- AC6: Opening one day late. Same as AC5, but the first four orders are placed at hour 24 instead of hour 0. The bakery is again ordered in the first hour with `storage.wood >= 15`. The same assertions hold up to tick 480. This shows that the start leaves room for a player who looks around first.
- AC7: No balance number changes. Storage start values, building costs, build times, workplaces, recipes and need numbers keep their current values. If AC5 or AC6 cannot pass with them, the builder stops and reports it. The builder does not tune numbers silently.

### UI, tests, build
- AC8: The wish number controls in the resident list (Bewohnerliste) show the start values on a new page: 2, 2, 1, 1, 2 in `JOBS` order. They show "0 von 0 Plätzen besetzt" until buildings exist, through the existing `formatJobTargets`. `src/ui/` and `src/text/de.ts` need no changes for this. A test on `formatJobTargets(createInitialState(SEED))` checks the targets.
- AC9: Existing tests that assert all-zero start wish numbers are updated to expect `START_JOB_TARGETS`, not deleted. These are `tests/assignment.test.ts` (around lines 91–113), `tests/production.test.ts` ("leaves a new game without targets or pins idle…") and the exact-shape check in `tests/state.test.ts`. They still check what they checked before: one key per job, a fresh object per game, and nobody working without buildings. Hand-made states with explicit `jobTargets` stay as they are. `npm test` and `npm run build` pass, and there are no new dependencies.

## Out of scope
- Starting buildings (for example a free well). Section 10 lists only 2 houses.
- Changing the starting goods, building costs, build times, recipes, ration sizes or the order of steps in `tick`.
- Hints, a tutorial or a start message in the chronicle that tells the player what to build first.
- Warnings before a good runs out, or a "days of water left" display. The production chain diagram (next backlog item) covers bottlenecks.
- Wish numbers that adapt automatically to population or buildings, and a "reset to defaults" button.
- Seasonal wheat. The farmer still produces all year (job 007), and the scenario tests rely on that only up to day 20 (spring and summer).

## Notes for the builder
- Files likely touched:
  - the new `src/sim/jobConstants.ts`, or another single job balance module, but not inline in `state.ts`;
  - `src/sim/state.ts`: `createJobTargets` returns a copy of `START_JOB_TARGETS`;
  - the existing tests listed in AC9;
  - a new scenario test, for example `tests/opening.test.ts`, for AC3 to AC6.
- Build the scenario with the real commands (`orderBuilding`) and `tick` only. Do not hand-make buildings or `workplaceId` values, because the point is to prove the real path works.
- The worked numbers for AC5 are a check for the builder, not something the test asserts:
  - The field is done after tick 12, the hut and the well after tick 24, and the mill after tick 72.
  - The woodcutters make 1 wood per hour from tick 25, so wood reaches 15 at about hour 29.
  - The bakery is done about 72 hours later (about hour 101). By then the miller has made about 14 flour.
  - Bread then grows by about 4 a day, water by about 10 and wood by about 21.
  - The lowest bread stock is about 28, after the hour-96 midnight and before the baker starts. The lowest water stock is about 32, after the hour-24 midnight.
- The wood is the tight part. Well, field, mill and bakery together cost 45 of the 50 wood, and adding the woodcutter hut makes 55. That is why the scenario builds the hut first and orders the bakery later. Keep this in a test comment, because it is the reason the woodcutter hut matters in the opening.
- Pass 5 of `assignJobs` fills jobs in `JOBS` order. The start wish numbers add up to exactly 8, so every built work building gets its workers. Check in the scenario that no job is starved because an earlier job took everyone.
- Tests use a fixed seed (the existing `SEED = 42` pattern).
