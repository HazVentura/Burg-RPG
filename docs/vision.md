# Burg-RPG – Vision und Spielregeln

Dieses Dokument ist die gemeinsame Grundlage für alle Features. Jede Spezifikation der Factory verweist darauf. Zahlen sind Startwerte zum Ausbalancieren, keine festen Gesetze.

## 1. Idee in einem Satz

Ein endloses Manager-Spiel im Browser: Du bist Burgherr und hältst eine mittelalterliche Burg am Leben, deren Bewohner in voneinander abhängigen Berufen arbeiten, Familien gründen, altern und den Winter überstehen müssen.

## 2. Grundentscheidungen

| Thema | Entscheidung | Später |
|---|---|---|
| Spielerrolle | Burgherr/Manager: Gebäude bauen, Berufe zuteilen | Charakter-Modus: eine einzelne Person spielen (wie FIFA Manager) |
| Spieler | Einzelspieler | – |
| Zeit | Echtzeit mit Ticks, Pause und Tempo (1x, 2x, 4x) | – |
| Ziel | Endlos: Sandbox plus Gefahren | weitere Gefahren, Meilensteine |
| Waren | Zentrales Burglager | Markt mit Geld und Preisen |
| Darstellung | Verwaltungsoberfläche (Panels, Tabellen, Kettendiagramm) | 2D-Karte |
| Sprache | Oberfläche Deutsch, Code Englisch, Texte zentral gesammelt | Übersetzungen |

## 3. Technik

- TypeScript, Vite, Vitest. Läuft nur im Browser, kein Server.
- **Simulationskern** als reine Funktionen: `tick(state) → state`. Kein Zugriff auf DOM, Zufall nur über einen übergebenen Zufallsgenerator mit Startwert (Seed), damit Tests reproduzierbar sind.
- **Oberfläche** liest den Zustand und schickt Befehle (z.B. „Person X wird Bäcker“), ändert den Zustand aber nie direkt.
- Speichern: automatisch jeden Spieltag in `localStorage`, dazu Export/Import als JSON-Datei. Der Spielstand hat eine Versionsnummer.
- `npm test` führt alle Tests aus.

## 4. Zeit

- 1 Tick = 1 Spielstunde. Bei 1x: 1 Spieltag (24 Ticks) pro echter Minute.
- 4 Jahreszeiten zu je 10 Tagen, ein Spieljahr = 40 Tage ≈ 40 Minuten.
- Start: Frühling, Jahr 1, Tag 1.

## 5. Berufe und Waren

| Beruf | Gebäude | Braucht | Erzeugt | Frei ab |
|---|---|---|---|---|
| Wasserträger | Brunnen | – | Wasser | Start |
| Bauer | Feld | (Werkzeug beschleunigt) | Weizen, **nur Ernte im Herbst**, wächst Frühling/Sommer | Start |
| Müller | Mühle | Weizen | Mehl | Start |
| Bäcker | Bäckerei | Mehl, Wasser, Holz (Ofen) | Brot | Start |
| Holzfäller | Holzfällerhütte | (Werkzeug beschleunigt) | Holz | Start |
| Bergmann | Mine | Brot (wie alle), (Werkzeug beschleunigt) | Eisenerz, Stein | Burgstufe 2 |
| Schmied | Schmiede | Eisenerz, Holz | Werkzeug | Burgstufe 2 |

Kreislauf: Der Schmied braucht Erz vom Bergmann, der Bergmann arbeitet mit Werkzeug vom Schmied schneller. Alle essen Brot und trinken Wasser. Holz wird von Bäcker, Schmied, Gebäuden und im Winter von den Häusern gebraucht.

Werkzeug nutzt sich ab und muss nachproduziert werden.

## 6. Gebäude

- Jeder Beruf braucht ein Arbeitsgebäude mit einer festen Zahl an Arbeitsplätzen.
- Wohnhäuser bieten Betten.
- Bauen kostet Holz und Stein und dauert eine feste Zeit. Gebaut wird automatisch, es gibt keinen eigenen Baumeister.
- Gebäudestufen kommen später.

## 7. Bewohner

Jeder Bewohner ist eine Einzelperson mit Name, Alter, Geschlecht, Partner, Beruf, Bedürfnissen und Erfahrung pro Beruf.

### 7.1 Bedürfnisse

Jedes Bedürfnis ist ein Wert von 0 bis 100.

```
Brot ─────┐
Wasser ───┤
Wohnraum ─┼──► Gesundheit ──► Arbeitsleistung, Geburten, Lebensdauer
Wärme ────┘
  ▲
  └── Holz (Brennholz pro Haus, nur Herbst/Winter)
```

- **Brot, Wasser:** werden täglich aus dem Lager verbraucht.
- **Wohnraum:** erfüllt, wenn die Person ein Bett hat.
- **Wärme:** nur im Haus möglich und kostet in Herbst und Winter Holz pro Haus. Wer obdachlos ist, friert im Winter immer.
- **Gesundheit:** ergibt sich aus den anderen vier. Sie sinkt langsam, wenn etwas fehlt, und erholt sich langsam, wenn alles erfüllt ist. Kranke arbeiten langsamer.
- Es gibt noch keinen Heiler. Gesundheit erholt sich von selbst.

### 7.2 Lebenslauf

| Phase | Alter (Spieljahre) | Echtzeit bei 1x |
|---|---|---|
| Kind: isst, arbeitet nicht | 0–3 | ca. 2 Std. |
| Lehrling: halbe Leistung, sammelt Erfahrung | 3–5 | |
| Erwachsen | ab 5 | |
| Altersschwäche möglich | ab ca. 25 | ca. 16 Std. |

- **Geburten:** Paare bekommen Kinder, wenn ein freies Bett, genug Essen und gute Gesundheit da sind.
- **Tod:** durch Altersschwäche oder wenn die Gesundheit länger auf 0 steht.
- **Abwanderung:** Wer länger unversorgt ist, kann die Burg verlassen.
- **Zuwanderung:** nur die Start-Siedler, sonst keine.

### 7.3 Arbeit und Erfahrung

- Du setzt Wunschzahlen pro Beruf, das Spiel verteilt freie Erwachsene. Einzelne Personen kannst du fest einem Beruf zuordnen.
- Erfahrung pro Beruf, Stufe 1 bis 10, Erfahrung pro gearbeiteter Stunde, jede Stufe +10 % Leistung.
- Erfahrung bleibt beim Berufswechsel erhalten, ein Wechsel kostet also Können.

## 8. Burgstufen

| Stufe | Bedingung | Schaltet frei |
|---|---|---|
| 1 | Start | 5 Startberufe |
| 2 | 15 Bewohner, Mühle und Bäckerei gebaut | Bergmann, Schmied |
| 3 | 30 Bewohner, Schmiede gebaut | Platz für spätere Features (Heiler, Gebäudestufen) |

## 9. Gefahren

- Erste Version: nur der **Winter**. Kein Weizenwachstum, Holzverbrauch zum Heizen, Ernte muss gelagert sein.
- Später: zufällige Ereignisse (Missernte, versiegter Brunnen, Feuer), Belagerungen mit Wachen und Waffen.

## 10. Spielstart

Frühling, Tag 1. 4 Paare (8 Erwachsene), 2 Wohnhäuser, Lager mit 60 Brot, 40 Wasser, 80 Weizen, 50 Holz, 20 Stein. Der Weizen überbrückt die Zeit bis zur ersten Ernte im Herbst.

## 11. Fahrplan

1. Zeit und Tick-Schleife (Pause, Tempo), Lager
2. Bewohner mit Brot und Wasser, 5 Startberufe, Gebäude
3. Verwaltungsoberfläche (Bewohnerliste, Lager, Berufe zuteilen) → **erste spielbare Version**
4. Jahreszeiten, Wohnraum, Wärme, Gesundheit, Winter
5. Geburten, Altern, Tod
6. Erfahrung, Burgstufen, Bergmann und Schmied mit Werkzeug
7. Speichern/Laden → **erste vollständige Version**

Danach (ungeordnet): Heiler, Gebäudestufen, Zufallsereignisse, Belagerungen, Markt mit Geld, 2D-Karte, Charakter-Modus.
