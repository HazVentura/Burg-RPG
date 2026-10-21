APPROVE

## Why
Round 1 has `VERDICT: PASS` from all four reviewers (code, security, UI, UX), and they raised only minor optional points. In `.worktrees/003-castle-storage` at the branch head (6da5f8f), `npm test` passed all 87 tests and `npm run build` succeeded. The diff meets AC1 to AC15, stays inside the files the spec lists, and does not touch `package.json`.

## For the human
What gets merged: a central castle storage in the simulation core.
- `GOODS`, `Good` and `Storage` live in `src/sim/goods.ts`.
- The start values are a frozen `INITIAL_STORAGE` in `src/sim/storageConstants.ts`: Brot 60, Wasser 40, Holz 50, Stein 20, all other goods 0.
- `GameState.storage` is copied fresh from that constant for each new game, and `tick` leaves it unchanged.
- The German good names and the heading "Lager" are in `src/text/de.ts`.
- A pure `formatStorage` rounds amounts down for display.
- Below the clock there is a "Lager" panel, built once as a `<dl>`. Each refresh updates only the amounts' `textContent`.
- Two existing tests in `tests/state.test.ts` were updated for the new state shape, not deleted.

Worth a look before pushing:
- The panel has not been seen in a real browser. Reviewers checked the 360 px layout by reading the CSS and doing the arithmetic. Please glance at it with `npm run dev`.
- The new state shape uses the identifiers `ironOre` and `tools`, and the display rounds down. Nothing is saved yet (save games come in step 7), so both are cheap to change now and harder to change once save games exist.
