# Job assignment (Berufszuteilung)

## Goal
The player sets a wish number (Wunschzahl) per job, and the simulation fills free workplaces in finished work buildings with free adults on its own. The player can also pin a single resident to a job, and the automatic distribution then never moves that person. After this job, the residents can actually staff the buildings from job 007 through commands, without hand-made `workplaceId` values. The UI for these commands comes later (step 3 "Bewohnerliste").

Rules from `docs/vision.md`:
- Section 7.3: "Du setzt Wunschzahlen pro Beruf, das Spiel verteilt freie Erwachsene. Einzelne Personen kannst du fest einem Beruf zuordnen."
- Section 6: "Jeder Beruf braucht ein Arbeitsgebäude mit einer festen Zahl an Arbeitsplätzen."
- Section 7.2: "Erwachsen | ab 5" game years; children (0–3) do not work.
- Section 3: "Oberfläche ... schickt Befehle (z.B. „Person X wird Bäcker“), ändert den Zustand aber nie direkt."

Existing design this job builds on (job 007): a resident's job is not stored. It follows from the type of the building in `Resident.workplaceId` (`jobForBuilding`). This job keeps that: it only decides which `workplaceId` each resident has.

## Acceptance criteria

### State
- AC1: `GameState` gets one new field `jobTargets: Record<Job, number>`, the wish number per job (one key per entry of `JOBS`, nothing else). `createInitialState(seed)` sets every wish number to 0. All existing fields keep their names, meanings and values.
- AC2: `Resident` gets one new field `pinnedJob: Job | null`. `null` means the resident is distributed automatically; a job means the player pinned them to it. Every settler starts with `pinnedJob: null` and `workplaceId: null`. No random draws are added, so `rngState`, names, ages, partners and needs stay exactly as before for every seed. With all wish numbers at 0 and nobody pinned, a new game after any number of ticks deep-equals what it was before this job, apart from the new fields.
- AC3: A resident is an adult when `getAgeYears(resident, elapsedHours) >= ADULT_AGE_YEARS`, with `ADULT_AGE_YEARS = 5` in `src/sim/residentConstants.ts` (section 7.2). `START_AGE_MIN_YEARS` refers to it or equals it (a test checks they agree). Only adults are ever given a workplace or can be pinned.

### The distribution (one pure function, for example `assignJobs(state): GameState`)
Terms: a *workplace* is one of the `workplaces` slots of a finished building whose type has a job. `slots(J)` is the sum of workplaces over all finished buildings of job J. `pinned(J)` is the number of adult residents with `pinnedJob === J`. The *auto quota* of J is `max(0, min(jobTargets[J], slots(J)) - min(pinned(J), slots(J)))`.

- AC4: Invalid workplaces are cleared: a resident gets `workplaceId: null` if they are not an adult, or their `workplaceId` points to no building, to a house, or to a building under construction. A pinned resident whose workplace's job is not their `pinnedJob` also loses it.
- AC5: Pinned residents come first. A pinned resident who already works in a building of their job keeps that exact building. A pinned resident without a workplace gets a free workplace of their job: the first building of that job in `state.buildings` order that still has room, residents handled in `state.residents` order. Pinned residents beyond `slots(J)` wait with `workplaceId: null`; they are not given any other job.
- AC6: A non-pinned resident who already works in a building of job J keeps that exact building as long as the number of such kept workers in J stays within J's auto quota, counted in `state.residents` order. The ones beyond the quota (the later ones in list order) are released (`workplaceId: null`) and count as free from here on.
- AC7: Free adults are the adults with `pinnedJob === null` and `workplaceId === null` after AC4 to AC6. In `state.residents` order, each free adult takes a workplace in the first job in `JOBS` order whose automatic worker count is still below its auto quota, in the first building of that job in `state.buildings` order with room. Free adults left over stay without a workplace.
- AC8: Consequences that tests pin:
  - No building ever has more residents pointing to it than its `workplaces`.
  - For each job J, the number of working residents is `max(min(pinned(J), slots(J)), min(jobTargets[J], slots(J)))` if there are enough free adults, and never more. So pinned residents count toward the wish number, and they may push a job above it.
  - The function is idempotent: `assignJobs(assignJobs(s))` deep-equals `assignJobs(s)`. Running it on a state with unchanged targets, pins and buildings moves nobody.
  - It changes only `workplaceId` of residents. `pinnedJob`, `jobTargets`, `storage`, `buildings`, needs and all other fields stay as they were.
- AC9: Worked example (seed 42, 8 settlers with ids 1–8, a finished well with 2 workplaces and a finished field with 4, nobody pinned):
  - targets waterCarrier 2, farmer 4: residents 1, 2 work in the well, 3–6 in the field, 7 and 8 are free.
  - then farmer lowered to 2: residents 5 and 6 are released; 1–4 keep their workplaces.
  - then resident 8 pinned to farmer: farmer auto quota becomes 1, so resident 3 keeps the field, resident 4 is released, and resident 8 works in the field.
  - then the farmer target set to 0: resident 3 is released, resident 8 still works in the field.
  - then resident 8 pinned to miller with no mill built: resident 8 has no workplace and is not used by any other job.

### Commands (in `src/sim/commands.ts`, same pattern as `orderBuilding`)
- AC10: `setJobTarget(state, job, count)` sets `jobTargets[job] = count` and returns `{ ok: true, state }` where the distribution (AC4–AC7) has already been applied. If `count` is not a non-negative integer (negative, fractional, `NaN`, `Infinity`), it returns `{ ok: false, reason: "invalidCount" }`. A wish number larger than the free workplaces is allowed; the job is then simply filled as far as possible.
- AC11: `setPinnedJob(state, residentId, job: Job | null)` sets that resident's `pinnedJob` and returns `{ ok: true, state }` with the distribution applied. `null` releases the pin; the resident then is handled like any non-pinned resident (they may keep their workplace under AC6). It returns `{ ok: false, reason: "unknownResident" }` if no resident has that id, and `{ ok: false, reason: "notAdult" }` if the resident is not an adult and `job` is not `null`.
- AC12: Both result types are discriminated unions on `ok`. A failed command changes nothing, and no command ever mutates its input state (deep-equals a `structuredClone` taken before the call).

### In the tick
- AC13: `tick` runs the distribution as its last step, after production, construction and the daily food consumption, using the new `elapsedHours`. So a building finished in tick t is staffed at the end of tick t and produces from tick t+1 (unchanged from job 007, AC9). Example: initial state, `setJobTarget(waterCarrier, 1)`, then order a well: nobody works during the 24 build hours; after tick 24 resident 1 has the well as workplace; water from production rises by 0.5 on tick 25.
- AC14: `tick` stays pure and deterministic: no input mutation, same input gives deep-equal output, no randomness used by the distribution.

### Plain data, tests, build, UI
- AC15: `GameState` stays plain JSON data: `JSON.parse(JSON.stringify(state))` deep-equals the state (`toStrictEqual`) for the initial state and after commands and ticks with targets, pins (both a job and `null`) and workplaces set.
- AC16: Unit tests in `tests/` (for example a new `tests/assignment.test.ts`) use fixed seeds or hand-made states and cover AC1 to AC15, including the AC9 sequence. Existing tests broken by the new fields are updated, not deleted, and still check what they checked before (the `Object.keys` lists in `tests/residents.test.ts` and `tests/state.test.ts`, the exact-shape `toEqual` in `tests/state.test.ts`, hand-made residents and states in `tests/needs.test.ts`, `tests/production.test.ts`, `tests/buildings.test.ts`). `npm test` and `npm run build` pass. `package.json` gets no new dependencies.
- AC17: Nothing in `src/ui/`, `src/main.ts` or `src/text/de.ts` changes. Since all wish numbers start at 0, the running page looks and behaves exactly as before.

## Out of scope
- Any UI: resident list, job display, controls for wish numbers or pins, German job names (step 3 "Bewohnerliste").
- Chronik messages such as "Kein freier Arbeitsplatz für Bäcker" (step 3 "Chronik").
- Apprentices (age 3–5, half rate) working, and children; there are none yet (step 5 "Altern und Lebensphasen"). This job only applies the adult check.
- Experience per job and choosing the most experienced resident for a workplace (step 6 "Erfahrung pro Beruf"). Distribution uses list order only.
- Fair or weighted sharing of free adults between jobs, priorities set by the player, or a default wish number other than 0.
- Pinning a resident to one specific building, moving workers between buildings of the same job, and working hours or shifts.
- Locking jobs by castle level, miner and smith (step 6).
- Housing, health or needs affecting who is assigned (step 4).
- Save game versioning or migrating old states (step 7).

## Notes for the builder
- Files likely touched: new `src/sim/assignment.ts` (`assignJobs`), `src/sim/commands.ts` (`setJobTarget`, `setPinnedJob` and their result types), `src/sim/state.ts` (`jobTargets` field, initial zeros, `assignJobs` as the last step of `tick`), `src/sim/residents.ts` (`pinnedJob` field, settlers start with `null`), `src/sim/residentConstants.ts` (`ADULT_AGE_YEARS`). Build the initial `jobTargets` from `JOBS` so a later job cannot be forgotten; return a fresh object per game.
- Keep `produceHour` as it is; its defensive worker cap stays useful for hand-made states.
- Suggested shape of `assignJobs`: build a map building id → remaining room and job id → slots/quota once, then do the four passes (AC4 clear, AC5 pinned, AC6 keep auto, AC7 fill free) over `state.residents` without reordering it. Return a resident object unchanged (same reference) when its `workplaceId` does not change; that keeps `tick` cheap and makes "moves nobody" easy to test.
- AC5 with an overfull building in a hand-made state: pinned residents keep a building only while it has room, in list order; the rest are treated as pinned without a workplace.
- An optional pure helper such as `getJob(buildings, resident): Job | null` (job from the workplace's building type) would help tests and the coming resident list.
- Edge cases to test: a wish number above the available workplaces; more pinned residents than slots; a pin to a job without any finished building; a resident under 5 years (hand-made `bornAtHour`) is neither assigned nor pinnable, and a workplace held by one is cleared; a building finishing on a midnight tick; two buildings of one job filled in list order; `setPinnedJob(id, null)` on an unpinned resident (succeeds, no change); a `workplaceId` pointing to a construction site or a deleted id is cleared.
- Assumptions to confirm with the orchestrator (each one is a line or a constant): wish numbers start at 0; pinned residents count toward the wish number and have priority over automatic workers; free adults are shared out in `JOBS` order, then list order; the distribution runs at the end of every tick and inside each assignment command; a pinned resident with no free workplace waits idle instead of working elsewhere.
