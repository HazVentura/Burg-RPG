# Bewohnerliste (resident list with job controls)

## Goal
The Bewohner area turns from a single count into the list of all residents: name, age, current job and a bar for each need. From this list the player can pin a resident to a job or release the pin, and can set the wish number (Wunschzahl) for each job. This is the "Berufe zuteilen" half of the first playable version (vision section 11, step 3). It uses the commands from job 008 and adds no new simulation rules.

Rules from `docs/vision.md`:
- Section 7: "Jeder Bewohner ist eine Einzelperson mit Name, Alter, Geschlecht, Partner, Beruf, Bedürfnissen und Erfahrung pro Beruf."
- Section 7.1: "Jedes Bedürfnis ist ein Wert von 0 bis 100." The needs that exist so far are Brot and Wasser (`Needs` in `src/sim/needs.ts`).
- Section 7.3: "Du setzt Wunschzahlen pro Beruf, das Spiel verteilt freie Erwachsene. Einzelne Personen kannst du fest einem Beruf zuordnen."
- Section 3: "Oberfläche liest den Zustand und schickt Befehle (z.B. „Person X wird Bäcker“), ändert den Zustand aber nie direkt."
- Section 5: the job names Wasserträger, Bauer, Müller, Bäcker, Holzfäller.

What exists today:
- `src/sim/commands.ts` has `setJobTarget(state, job, count)` (fails with `invalidCount`) and `setPinnedJob(state, residentId, job | null)` (fails with `unknownResident` or `notAdult`). Both redistribute at once via `assignJobs`.
- `getJob(buildings, resident)` in `src/sim/assignment.ts` gives a resident's current job, or null. `getAgeYears` and `isAdult` are in `src/sim/residents.ts`.
- `src/ui/app.ts` builds the page once, and `refresh` only changes `textContent` and `aria-pressed`, so focus survives ticks (job 009, AC7). The Bewohner area shows "Anzahl" via `formatResidentSummary`.
- The live game has no work buildings yet. The player can order them only once the Gebäude-Panel job is done. Until then a wish number or pin shows up in the list, but nobody actually gets a workplace in the browser. Tests use states with buildings ordered through `orderBuilding` and then ticked.

## Acceptance criteria

### Simulation guard (small, from the job 008 security follow-up)
- AC1: `setJobTarget` and `setPinnedJob` check at runtime that `job` is one of `JOBS`. For `setPinnedJob`, `null` is also accepted. Any other value, such as a string coming from a tampered `<select>`, returns `{ ok: false, reason: "unknownJob" }` and changes nothing. All other behavior of both commands stays exactly as in job 008, and the existing tests pass unchanged.

### Formatting (pure, DOM-free, unit-tested)
- AC2: `src/text/de.ts` gets a German name for every job, keyed by `Job` (`Record<Job, string>`, so a missing job is a type error): Wasserträger, Bauer, Müller, Bäcker, Holzfäller. It also gets the need names Brot and Wasser, keyed by need, and every other new string from this job.
- AC3: A pure formatter, for example `formatResidentList(state)` in `src/ui/`, returns one row per resident in `state.residents` order. Each row has:
  - the resident `id`;
  - the `name`;
  - the age as text from `getAgeYears(resident, state.elapsedHours)`, "1 Jahr" for exactly 1 and "<n> Jahre" otherwise;
  - the job as text: the German name of `getJob(state.buildings, resident)`, or "Ohne Arbeit" when that is null;
  - the pin as data: `pinnedJob` (a `Job` or `null`), and whether the pin can be changed to a job (that is, `isAdult`);
  - one entry per need in a fixed order (Brot, then Wasser), with the German label, the value as a number from 0 to 100, and the value as text rounded down.
- AC4: When a resident is pinned to a job but has no workplace (no finished building of that job, or no free place), the job text is "Ohne Arbeit", and the row also carries a short note such as "Wartet auf Arbeitsplatz". This way the player sees that the pin is in effect but is not being served.
- AC5: A pure formatter, for example `formatJobTargets(state)`, returns one row per job in `JOBS` order. Each row has the job, its German name, the wish number `state.jobTargets[job]`, the number of residents currently working in that job (`getJob` over all residents), and the number of workplaces in finished buildings of that job.
- AC6: Unit tests with a fixed seed cover AC1 to AC5. They check:
  - the initial state: 8 rows, all "Ohne Arbeit", nobody pinned, needs at 100, every wish number 0 with 0 working and 0 places;
  - a state with a finished well (ordered, then 24 ticks) and the waterCarrier wish number set to 2: two residents show "Wasserträger", and the well row shows wish 2, working 2, places 2;
  - a resident pinned to miller with no mill: "Ohne Arbeit" plus the waiting note;
  - a need below 100 after days without bread (hand-made storage), shown rounded down;
  - the singular "1 Jahr" on a hand-made resident.

### Resident list in the Bewohner area
- AC7: The Bewohner area keeps its heading "Bewohner" and the "Anzahl" count. Below the count it lists every resident in `state.residents` order. Each resident shows the name, age, job text (plus the waiting note from AC4 when it applies), one bar per need and a job control. The list uses semantic markup, either a `<table>` with `<th scope="col">` headers or a `<ul>` with one `<li>` per resident, so a screen reader can tell which values belong to which resident.
- AC8: Each need bar is a native `<meter min="0" max="100">` (or an element with `role="meter"` and `aria-valuenow`/`aria-valuemin`/`aria-valuemax`) with an accessible name such as "Brot". The value is also visible as a number, so the bar does not rely on color alone. The bar is visibly different at 100, around 50 and at 0.
- AC9: Each resident has a `<select>` with a visible or accessible label naming the resident (for example "Beruf für Adelheid"). Its first option is "Automatisch" (no pin), followed by the five jobs in `JOBS` order with their German names. The selected option always matches `pinnedJob`. Choosing a job calls `setPinnedJob(state, id, job)`, and choosing "Automatisch" calls `setPinnedJob(state, id, null)`. For residents who are not adults, the select is disabled. There are none yet, but the formatter already provides the flag.

### Wish numbers
- AC10: The Bewohner area has a group "Wunschzahlen" (a heading or `<fieldset>`/`<legend>`) with one row per job in `JOBS` order. Each row shows the German job name, the wish number, and "<working> von <places> Plätzen" (or equivalent wording) from AC5. A "−" and a "+" button change the wish number by 1 through `setJobTarget`. Each button has an accessible name with the job (for example "Bäcker: Wunschzahl verringern"). "−" is disabled at 0, so the UI never sends a negative count. "+" has no upper limit: job 008 allows a wish number above the available places.
- AC11: After every command (pin or wish number), the UI replaces its state with the command's `result.state` and calls `refresh` at once, even while the clock is paused. So the job texts, counts and selects change without waiting for a tick. The UI never writes to `GameState` itself.
- AC12: When a command returns `ok: false`, the state is not replaced, and a German message for the reason (`invalidCount`, `unknownResident`, `notAdult`, `unknownJob`, texts in `de.ts`) appears in one message element with `role="alert"` inside the Bewohner area. The next successful command clears it. These failures cannot happen through normal use of the controls; this is a safety net, not a flow.

### Rendering behavior kept from job 009
- AC13: Rows are built once per resident and updated in place on every `refresh`, keyed by resident id. Updates touch only `textContent`, meter values, `disabled`, and `select.value` (and `select.value` only when it differs from the state). So a focused select or "+"/"−" button keeps keyboard focus while time runs, and an open select is not reset by a tick. If the set of resident ids changes, rows for new ids are added and rows for gone ids are removed, without rebuilding the other rows. Nothing in the game can trigger this yet, but the code must not assume 8 residents.
- AC14: No new `aria-live` regions besides the `role="alert"` message from AC12. Text is set with `textContent`, never `innerHTML`; resident names must never be parsed as HTML.

### Layout (checked by reading `src/ui/styles.css` and with `npm run dev` in device mode)
- AC15: At 360 px viewport width, and also at 200 % text size, nothing scrolls horizontally. A resident's name, age, job, bars and select wrap within the panel, for example as one stacked card per resident. All buttons and selects are at least 44 × 44 CSS px. The existing colors, panel style, focus outline (`3px solid #2457a6`) and tabular digits are reused, with no new palette.
- AC16: From 48rem upward, the Bewohner area may span the full grid width, for example with `grid-column: 1 / -1`, because it is the widest area. The single breakpoint from job 009 stays the only media query. Lager and Gebäude stay as they are.

### Tests and build
- AC17: `npm test` and `npm run build` pass. Existing tests are not deleted; `tests/formatSummary.test.ts` still checks "Anzahl". `package.json` gets no new dependencies, and no DOM test library is added. `src/sim/` changes only for AC1.

## Out of scope
- Ordering buildings, showing build progress or per-building occupancy (next job, "Gebäude-Panel"). This means that in the browser, wish numbers and pins have no visible effect on workplaces until that job lands.
- Chronik messages about assignment, such as "Kein freier Arbeitsplatz" (job "Chronik").
- Sex, partner, experience, health, housing or warmth in the list. Those needs do not exist yet; the list shows only `Needs` as it is today. Showing partner or sex is not requested.
- Sorting, filtering or searching the list, paging, and collapsing the area.
- Pinning to a specific building, or job locks by castle level (step 6).
- Typing a wish number into a text field, keyboard shortcuts, and bulk actions such as "release all pins".
- Changing the assignment rules of job 008 (priority, order, quotas).
- Any change to the clock, Lager or Gebäude areas apart from the grid placement in AC16.

## Notes for the builder
- Files likely touched: `src/sim/commands.ts` (AC1 guard, a new `unknownJob` reason in both result unions), `src/ui/app.ts` (resident list view, wish number view, command handlers, alert element), a new `src/ui/formatResidents.ts` (or an extension of `formatSummary.ts`), `src/text/de.ts` (`jobs`, `needs`, list and wish-number strings, error texts), `src/ui/styles.css`, and new tests such as `tests/formatResidents.test.ts` and an addition to `tests/assignment.test.ts` or a new commands test for AC1.
- Follow the existing pattern: `build...View()` returns the elements to update, and `update...View(view, rows)` is called from `refresh`. Keep a `Map<residentId, RowView>` for AC13. Command handlers have to read the current `state` variable inside `renderApp` when they run, not a value captured at build time.
- The `<select>` value is a string. Map it back to `Job | null` explicitly ("" for Automatisch). AC1 means a bad value is rejected in the core and does not get through silently.
- Need bars: `<meter>` has built-in low/high styling; set `low`/`high`/`optimum` so a low value looks different, or style a plain bar. In both cases, show the number next to the bar.
- Ages: settlers are 5 to 10 years old (`START_AGE_MIN_YEARS`/`START_AGE_MAX_YEARS`), so the singular needs a hand-made resident in a test.
- For the "working" count, use `getJob`. For the "places" count, sum `getBuildingDefinition(type).workplaces` over finished buildings of the job (`isFinished`, `JOB_BUILDING`). Do not duplicate the quota logic from `assignJobs`.
- Edge cases to test: a pinned resident who keeps working after the pin is released (job 008, AC11); a wish number above the places (for example wish 5, 2 working, 2 places); "−" at 0 is disabled in the view, and the formatter row still says 0.
- Assumptions to confirm with the orchestrator: "+"/"−" buttons instead of a number input; "Automatisch" as the label for no pin; showing "working of places" per job in the wish-number rows; the AC1 runtime guard in the core is part of this job.
