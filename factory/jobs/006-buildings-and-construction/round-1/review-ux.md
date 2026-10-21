VERDICT: PASS

## Findings
- [minor] src/sim/commands.ts: `OrderResult` failure carries only `reason: "notEnoughGoods"`, not which good is short or by how much. Fix: when the building panel job adds the UI, show the missing amounts (derive from cost and storage) and a `role="alert"` message in `src/text/de.ts`.

## Checked
- Diff stat shows no changes in src/ui, src/main.ts or src/text/de.ts, so the page behaves as before (AC18). No user-visible flow exists yet.
- Failed order is a typed, non-mutating result, so a later UI can show a clear error without a half-paid state.
- Players see no new text, so wording and accessibility are unaffected in this job.
