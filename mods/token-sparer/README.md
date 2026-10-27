# token-sparer

Ein Claude-Code-Mod für burg-rpg mit zwei Teilen:

1. **Token-Zähler:** zählt den Token-Verbrauch jedes Turns, getrennt nach Agent (Hauptsitzung bzw. Orchestrator, builder, code-reviewer, playtester, ...). Die Statuszeile zeigt die Summe, `/tokens` zeigt die Tabelle.
2. **Ausgaben-Kürzer:** Läuft `npm test` oder `npm run build` **erfolgreich**, bekommt der Agent nur die Zusammenfassung statt aller Zeilen. Fehlgeschlagene Läufe, Konsolenausgaben (`stdout | ...`, etwa die Logs des Playtesters) und Läufe einer einzelnen Testdatei bleiben **immer vollständig**.

## Voraussetzung

Claude Code v2.1.287 oder neuer (`claude --version`).

## Starten

Im Projektordner:

```bash
claude --plugin-dir mods/token-sparer
```

Damit der Mod dauerhaft geladen wird, trägst du in `~/.claude/settings.json` Folgendes ein (absoluter Pfad, `~` ist erlaubt):

```json
{ "env": { "CLAUDE_CODE_PLUGIN_DIRS": "~/projects/burg-rpg/mods/token-sparer" } }
```

Ob der Mod geladen ist, siehst du mit `/plugin`. Dort steht dann `1 mod active · token-sparer`.

## Befehle

| Befehl | Wirkung |
|---|---|
| `/tokens` | Tabelle dieser Sitzung: Input, Cache+, Cache→, Output, Neu, Turns pro Agent |
| `/tokens verlauf` | die letzten 10 Sitzungen, um Läufe miteinander zu vergleichen |
| `/tokens reset` | Zähler auf null setzen, etwa direkt vor einem `/factory next` |

Spalten: **Input** = neue Input-Tokens, **Cache+** = in den Prompt-Cache geschrieben, **Cache→** = aus dem Cache gelesen (deutlich günstiger), **Output** = vom Modell erzeugt, **Neu** = Input + Cache+ + Output. Cache→ zählt nicht zu Neu, weil Cache-Lesen nur einen Bruchteil kostet. Die Statuszeile zeigt es getrennt an.

## Volle Ausgabe erzwingen

Schreib `VOLL=1` vor den Befehl, z. B. `VOLL=1 npm test`.

## Grenzen

- Die Ersparnis von „ca. N Tokens“ ist eine Schätzung (etwa 4 Zeichen pro Token).
- Nach einem Neuladen des Mods beginnt der Zähler der laufenden Sitzung von vorn. Der Verlauf bleibt erhalten.
- `git diff` und alle anderen Befehle werden nie gekürzt, auch nicht in einer Kette wie `npm test && git diff`. Ein vorangestelltes `cd ... &&` ist erlaubt.
- Gekürzt wird nur, was der Mod sicher als erfolgreichen Vitest- oder Vite-Lauf erkennt. Alles andere bleibt unverändert.

## Tests

```bash
claude plugin test mods/token-sparer
```
