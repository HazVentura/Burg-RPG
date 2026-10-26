# Burg-RPG

Endless single-player castle-economy manager in the browser. The game rules live in
`docs/vision.md` (German); read it before designing or building any feature.

## Stack and commands

- TypeScript (strict), Vite, Vitest. Browser only, no server.
- `npm test` runs all tests (Vitest, files in `tests/**/*.test.ts`).
- `npm run build` type-checks and builds to `dist/`.
- `npm run dev` starts the dev server.
- Pushes to `main` deploy to GitHub Pages via `.github/workflows/pages.yml`.

## Architecture

- `src/sim/` is the simulation core: pure functions such as `tick(state) -> state`.
  It never touches the DOM, `Date.now()` or `Math.random()`; randomness comes from
  `createRandom(seed)` in `src/sim/random.ts`.
- `src/ui/` renders state and sends commands to the core. It never mutates state directly.
- `src/text/de.ts` holds every player-facing string (German).

## Conventions

- Code, identifiers, comments and commit messages in English; UI text in German.
- Readable over clever. Comment the why, not the obvious.
- Every simulation rule gets a unit test in `tests/`. Tests use a fixed seed.
- Game balance numbers live in one constants module per area, not inline.

## Software factory

`/factory` runs features through spec → build → test gate → reviews + playtest → approval → merge into local
`main`. See `.claude/skills/factory/SKILL.md`. Queue: `factory/backlog.md`.
Agents never edit `factory/board.json`; only the orchestrator does.
The factory never pushes. Pushing `main` is a human decision and deploys to GitHub Pages.

UI code for UI/UX reviewers: `src/ui/` and the styles it uses; player-facing text in `src/text/de.ts`.
