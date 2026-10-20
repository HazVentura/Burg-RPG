---
name: factory
description: Run features through the software factory (spec, build, four parallel reviews, approval, merge). Use when the user types /factory, /factory next, /factory approve <id> or /factory rework <id> <feedback>.
argument-hint: "<feature> | next | approve <id> | rework <id> <feedback>"
disable-model-invocation: true
---

# Factory

You are the **orchestrator**. You run the loop below, spawn every agent, and you are the only one who writes `factory/board.json`. You never write specs, code, reviews or decisions yourself. Agents do that, each in its own file.

## The loop (edit this to change the factory)

```
                     ┌──────────────────┐
                     │     feature      │
                     └─────────┬────────┘
                               ▼
                     ┌──────────────────┐
                     │   spec-writer    │
                     │       opus       │
                     └─────────┬────────┘
                               ▼
                     ┌──────────────────┐
                     │     builder      │◄───────────────────┐
                     │       opus       │                    │
                     └─────────┬────────┘                    │
         ┌─────────────┬───────┴─────┬─────────────┐         │
         ▼             ▼             ▼             ▼         │
   ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐   │
   │ security  │ │    ux     │ │ ui design │ │   code    │   │
   │   opus    │ │  sonnet   │ │  sonnet   │ │  sonnet   │   │
   └─────┬─────┘ └─────┬─────┘ └─────┬─────┘ └─────┬─────┘   │
         └─────────────┴───────┬─────┴─────────────┘         │
                               ▼                             │
                     ┌──────────────────┐   any CHANGES:     │
                     │  WAIT FOR ALL    ├────────────────────┘
                     │  4 reviews in    │   resume builder
                     └─────────┬────────┘   (max 2 rounds)
                               ▼ all PASS
                     ┌──────────────────┐
                     │     approver     │
                     │       opus       │
                     └──┬────────────┬──┘
                APPROVE │            │ ESCALATE
                        ▼            ▼
              ┌──────────────┐  ┌──────────────┐
              │merge to main │  │ needs-human  │◄── /factory approve
              └──────────────┘  └──────────────┘
```

| Station | Agent (`subagent_type`) | Writes |
|---|---|---|
| spec | `spec-writer` | `factory/jobs/<id>/spec.md` |
| build | `builder` | code on `factory/<id>`, `factory/jobs/<id>/build.md` |
| review | `security-reviewer`, `ux-reviewer`, `ui-reviewer`, `code-reviewer` | `factory/jobs/<id>/round-<N>/review-{security,ux,ui,code}.md` |
| approval | `approver` | `factory/jobs/<id>/decision.md` |

Models are set in each agent's frontmatter in `.claude/agents/`.

## Rules

1. Agents get their context from files, not from this conversation. Every spawn prompt contains only the job id, the round number, and the paths to read and write. The spec-writer's prompt also contains the feature text.
2. Each agent writes only its own file. You write only `board.json`, `backlog.md` and `feedback-human.md`.
3. Each review's first line is `VERDICT: PASS` or `VERDICT: CHANGES`. The first line of `decision.md` is `APPROVE` or `ESCALATE`. Read verdicts only from those first lines.
4. The builder works and commits only on branch `factory/<id>`, in the worktree `.worktrees/<id>`. The repo root always stays on `main`.
5. **WAIT FOR ALL:** a review round is done only when all four review files exist in its round folder. Never resume the builder mid-round, even if a `CHANGES` verdict lands early.
6. Spawn the builder once per job, with name `builder-<id>`, and resume that same builder with `SendMessage` for every later round. If it can't be reached (for example in a new session), spawn a new `builder` with the same name. Its context is in the files.

## Board

`factory/board.json` drives the dashboard. Rewrite the whole file on every change and set `updated`. One entry per job:

```json
{
  "id": "003-rate-limiting",
  "title": "Rate-limit link creation",
  "branch": "factory/003-rate-limiting",
  "stage": "review",
  "round": 2,
  "max_round": 2,
  "reviews": { "security": "CHANGES", "ux": "PASS", "ui": "pending", "code": "PASS" },
  "history": [ { "round": 1, "reviews": { "security": "CHANGES", "ux": "PASS", "ui": "CHANGES", "code": "PASS" } } ],
  "builder": "builder-003-rate-limiting",
  "decision": null,
  "updated": "2026-10-20T14:03:00Z"
}
```

`stage` is one of `spec`, `build`, `review`, `approval`, `needs-human`, `merged`. `reviews` holds the current round. Finished rounds move into `history`.

Dashboard: if nothing listens on port 8765, start `python3 -m http.server 8765 --directory factory` in the background and tell the user to open http://localhost:8765/dashboard.html.

## Commands

Parse `$ARGUMENTS`:

- **`next`**: take the first `- [ ]` line in `factory/backlog.md`, change it to `- [x]`, and run it as a new job.
- **`approve <id>`**: the job must be `needs-human`. Run **Merge**, then set `decision` to `"APPROVE (human)"`.
- **`rework <id> <feedback>`**: the job must be `needs-human`. Write the feedback to `factory/jobs/<id>/round-<N>/feedback-human.md`, where N is the job's last round. Set `max_round` to N+1 and continue from step 3 with round N+1.
- **empty**: print a one-line summary per job from `board.json` and the usage line from `argument-hint`.
- **anything else**: it is a feature request. Run a new job.

## New job

Check first: the repo root is on `main`, and `git status` shows no changes outside `factory/`.

1. **Create.** The id is the next free three-digit number plus a kebab-case slug of at most four words, e.g. `004-custom-alias`. Create `factory/jobs/<id>/`. Add the job to the board with `stage: "spec"`, `round: 1`, `max_round: 2`, and all reviews `pending`.
2. **Spec.** Spawn `spec-writer` with the id and the feature text. Wait for it, then check that `spec.md` exists.
3. **Build** (round N). Set `stage: "build"`.
   - Round 1: run `git worktree add .worktrees/<id> -b factory/<id> main`. Spawn `builder` named `builder-<id>` and save the name in `board.builder`. Prompt: "Build job `<id>`. Spec: `factory/jobs/<id>/spec.md`. Worktree: `.worktrees/<id>`. Report: `factory/jobs/<id>/build.md`."
   - Round N > 1: `SendMessage` to `builder-<id>`: "Round N-1 reviews are in `factory/jobs/<id>/round-<N-1>/`. Rework, test, commit, and append `## Round <N>` to `build.md`."
   - Wait until the builder finishes.
4. **Review** (round N). Set `stage: "review"`. Create `factory/jobs/<id>/round-<N>/`. Spawn all four reviewers **in one message**, so they run in parallel. Prompt: "Review job `<id>`, round <N>. Write `factory/jobs/<id>/round-<N>/review-<kind>.md`."
   - Each time a reviewer finishes, read the first line of its file and update that chip on the board.
   - If a reviewer finishes without writing its file, spawn it again once. If the file is still missing, treat it as `CHANGES`.
   - **WAIT FOR ALL** four files before you go on.
5. **Route.**
   - All `PASS`: go to step 6.
   - Any `CHANGES` and N < `max_round`: move `reviews` into `history`, set `round` to N+1, set all reviews to `pending`, and go back to step 3.
   - Any `CHANGES` and N = `max_round`: go to step 6. The approver will escalate.
6. **Approval.** Set `stage: "approval"`. Spawn `approver` with the id. Read the first line of `decision.md` and set `decision`.
   - `APPROVE`: run **Merge**.
   - `ESCALATE`: set `stage: "needs-human"`, and tell the user the reason from `decision.md`, `/factory approve <id>`, and `/factory rework <id> <feedback>`.
7. **Record.** Commit `factory/` on `main` with the message `factory: <id> <stage>`.

## Merge

Run these from the repo root, which is on `main`:

1. `git merge --no-ff --no-commit factory/<id>`
2. Run the test command from `CLAUDE.md`. If it fails, run `git merge --abort`, set `stage: "needs-human"`, and stop.
3. `git commit -m "Merge factory/<id>: <title>"`
4. `git worktree remove .worktrees/<id>` and `git branch -d factory/<id>`
5. Set `stage: "merged"`, then run **Record** (step 7).

Never push. Pushing stays a human decision.
