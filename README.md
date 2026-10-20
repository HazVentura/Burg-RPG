# Burg-RPG

Ein endloses Burg-Managerspiel im Browser: mittelalterliche Berufe, die voneinander abhängen, Familien, Winter und ein Levelsystem.

- Spielregeln und Vision: [docs/vision.md](docs/vision.md)
- Entwicklung: `npm install`, dann `npm run dev`; Tests mit `npm test`
- Spielen: jeder Push auf `main` wird auf GitHub Pages veröffentlicht

## Software-Factory

Features werden mit der Software-Factory gebaut (ein Claude-Code-Skill und sieben Subagents):

```
feature → spec-writer → builder ⇄ 4 reviewers (security · ux · ui · code) → approver → merge | needs-human
```

| Befehl | Was passiert |
|---|---|
| `/factory next` | nächsten offenen Punkt aus [factory/backlog.md](factory/backlog.md) bauen |
| `/factory <feature>` | ein freies Feature durch die Schleife schicken |
| `/factory approve <id>` | einen `needs-human`-Job nach `main` mergen |
| `/factory rework <id> <feedback>` | einen `needs-human`-Job mit Feedback zurück an den Builder |

Dashboard: `python3 -m http.server 8765 --directory factory`, dann http://localhost:8765/dashboard.html.
Die Factory pusht nie; `git push` auf `main` bleibt deine Entscheidung.
