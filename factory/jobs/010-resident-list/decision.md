APPROVE

## Why
In round 1, all four reviewers (code, security, UI, UX) gave `VERDICT: PASS` and raised only minor findings. I ran `npm test` (304/304 pass) and `npm run build` in `.worktrees/010-resident-list` myself, and both pass. The diff stays inside the spec. `src/sim/` only gains the AC1 `isJob` guard and the `unknownJob` reason. No dependencies were added, no tests were deleted, there is no `innerHTML` and no new `aria-live`, and the job 009 breakpoint is still the only media query. The change is easy to undo: it adds UI code and one failure reason, and it touches no data formats and deletes nothing.

## For the human
What gets merged: the Bewohner area becomes a list of resident cards. Each card shows name, age, job (with a "Wartet auf Arbeitsplatz" note when it applies), Brot/Wasser `<meter>` bars with the number shown, and a "Zuteilung für <Name>" select with "Automatisch" plus the five jobs. Below the cards is a "Wunschzahlen" group with −/+ steppers and "x von y Plätzen besetzt". Failed commands show a German message in a single `role="alert"`. The core rejects unknown job strings from the DOM. Pure formatters live in `src/ui/formatResidents.ts`, tested in `tests/formatResidents.test.ts` and `tests/commands.test.ts`.

Worth a glance later (none of this blocks the merge):
- 200 % text size was not checked in a real browser. It was only reasoned from the CSS (`min()`, flex-wrap).
- On desktop, Bewohner spans the full width, so Lager and Gebäude each get a row with empty space beside them.
- The select label says "Zuteilung für" instead of the spec's example "Beruf für".
- The job text and the waiting note are adjacent spans with no separator, so a screen reader may read them run together.
- The error box looks neutral, and the meter colours are the browser defaults.
- "−" loses focus when it becomes disabled at 0.
