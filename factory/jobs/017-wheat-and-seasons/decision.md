APPROVE

## Why
All five reviewers (security, ux, ui, code, play) give `VERDICT: PASS` in round 1. I ran `npm test` (454 passing) and `npm run build` (passes) myself in `.worktrees/017-wheat-and-seasons`. The diff stays inside the spec: it adds no dependencies, touches only the files the spec names plus test fixtures, and does not edit `docs/vision.md`. The 80 starting wheat matches what the human already wrote into vision section 10 in commit `1341511`. The new `fieldWheat` field is not a lasting data format, because there are no saves or localStorage, so the change is easy to undo.

## For the human
What gets merged:
- Farmers follow the seasons. In spring and summer they grow 0.5 wheat per worker-hour on the fields (`GameState.fieldWheat`). In autumn each farmer moves up to 2 wheat per hour into storage. In winter the fields rest, and wheat not harvested by then is lost.
- The rules live in `src/sim/farmingConstants.ts`. One named helper, `farmerHour`, applies them inside the worker-hour loop that `produceHour` and `findShortages` share.
- `INITIAL_STORAGE.wheat` goes up to 80, with a comment explaining why.
- When a finished field exists, the Lager panel shows one more line, for example "Auf den Feldern: N Weizen, wächst / Erntezeit / Feld ruht".
- There is a new `tests/farming.test.ts`, including the exact full-year test. The opening test now runs to day 30, and the older tests were updated rather than deleted.

Minor points that do not block the merge:
- In `src/ui/styles.css`, the new `.storage-fields` rule sits between the "Safety-net message..." comment and `.command-error`, so that comment now describes the wrong rule.
- The playtest found that the miller runs out of wheat around day 10 while wheat sits on the fields until autumn, so "Engpass: Weizen" shows for most of the first summer. The spec says this is intended for now.
- Two farmers make exactly the 480 wheat a year that one miller uses, so the chain has no slack once the population grows. Both points are balance questions for a later job.

The spec listed some assumptions for confirmation, and the merge locks them in. Check that you agree:
- Unharvested wheat is lost in winter.
- Harvesting needs farmer worker-hours.
- There is one total `fieldWheat` for all fields.
