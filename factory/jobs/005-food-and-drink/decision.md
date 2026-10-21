APPROVE

## Why
All four round-1 reviews (code, security, UI, UX) say `VERDICT: PASS`, with only minor notes that the spec already puts out of scope. I ran `npm test` (150/150 passing) and `npm run build` (passing) myself in `.worktrees/005-food-and-drink` at 4ece813. The diff touches only `src/sim/` and `tests/`, adds no dependencies, and matches AC1 to AC14. The new `Resident.needs` field changes the state shape, but no save format exists yet, so this is easy to undo.

## For the human
What gets merged:
- `src/sim/needConstants.ts` (new): NEED_MIN 0, NEED_MAX 100, 1 bread and 1 water per resident per day, a drop of 25 per day without.
- `src/sim/needs.ts` (new): the `Needs` type (`bread`, `water`) and a pure `consumeDailyFood`. When food runs short, the residents with the lowest need eat first, and ties go by list order.
- `src/sim/residents.ts`: settlers start with full needs. No random draws, so the seeded settlers stay the same.
- `src/sim/state.ts`: `tick` runs the daily consumption on every step into hour 0 (first on tick 24).
- Tests: new `tests/needs.test.ts`. The existing storage, residents and state tests were updated, not deleted.

What you will see in the game: Brot and Wasser in the storage panel drop by 8 each midnight. Wasser reaches 0 on day 6 and Brot on day 8. Nothing tells the player about it yet, which the spec accepts until the production, Chronik and need-bar jobs land. Future save import should check that need values are finite and in range (security note for step 7).
