APPROVE

## Why
Round 1 has `VERDICT: PASS` from all four reviewers (code, security, UI, UX), and only minor findings. I ran `npm test` (68 tests, 5 files) and `npm run build` in `.worktrees/002-browser-game-clock` myself, and both pass. The diff covers AC1-AC19, touches only the files the spec names, leaves `src/sim/` and `package.json` unchanged, and is easy to undo because it stores no data.

## For the human
What gets merged:
- A pure clock in `src/ui/clock.ts` that turns real time into ticks, with pause, speeds 1x/2x/4x, carry-over of leftover time and a 1 000 ms cap per update. Its pacing constants are in `src/ui/clockConstants.ts`, with ms per tick derived from `HOURS_PER_DAY`.
- `formatClock` in `src/ui/formatClock.ts`, and the German strings in `src/text/de.ts`.
- `src/ui/app.ts`, which now builds the page once with `createElement` instead of `innerHTML` and runs a `requestAnimationFrame` loop. `src/main.ts` adds a fixed `GAME_SEED = 1`. There is a new `src/ui/styles.css`.
- Unit tests in `tests/clock.test.ts` and `tests/formatClock.test.ts`.

Before you push `main` (which deploys to GitHub Pages): no agent has run this in a real browser. Run `npm run dev` and check four things:
- The clock starts at `Tag 1, Jahr 1 / Frühling / 00:00 Uhr` and goes up one hour about every 2.5 s at 1x.
- Pause/Weiter and the speed buttons work, and a focused button keeps focus while time runs.
- Nothing scrolls sideways at 360 px width.
- The buttons are easy to tap.

Optional follow-up from the UI review: move the colors in `styles.css` into CSS custom properties before the next UI job reuses them.
