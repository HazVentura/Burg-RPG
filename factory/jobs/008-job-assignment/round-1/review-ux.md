VERDICT: PASS

## Findings
- [minor] src/sim/commands.ts: failure reasons (`invalidCount`, `unknownResident`, `notAdult`) have no German text yet. Fix: add player-facing strings in `src/text/de.ts` when the Bewohnerliste UI job lands, shown with `role="alert"`.

## Checked
- No changes in src/ui, src/main.ts or src/text/de.ts (AC17): the running page behaves as before, since all wish numbers start at 0.
- Command results are discriminated unions with distinct reasons, so a later UI can tell the user what went wrong.
- Failed commands change nothing; a pin to a job with no building leaves the resident idle, which is the specified behavior.
- No user-visible flow, keyboard or screen-reader surface exists in this job.
