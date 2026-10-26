# Backlog

`/factory next` takes the first unchecked item, checks it off, and runs it as a new job.
Rules, numbers and terms come from `docs/vision.md`. Each item is one job.

## Schritt 1: Zeit und Lager

- [x] Spielzustand und Kalender im Simulationskern: `GameState`, `createInitialState(seed)` und `tick(state)`, das pro Tick eine Spielstunde weiterzählt (24 Stunden pro Tag, 10 Tage pro Jahreszeit, 4 Jahreszeiten pro Jahr, Start Frühling Jahr 1 Tag 1)
- [x] Spieluhr im Browser: Echtzeit-Schleife, die `tick` aufruft, mit Pause und Tempo 1x/2x/4x (1x = 1 Spieltag pro echter Minute) und Anzeige von Datum, Jahreszeit und Uhrzeit
- [x] Burglager: Warenarten (Weizen, Mehl, Brot, Wasser, Holz, Stein, Eisenerz, Werkzeug), Lagerbestand im Zustand mit Startwerten aus der Vision und ein Lager-Panel in der Oberfläche

## Schritt 2: Bewohner, Gebäude, Produktion

- [x] Bewohner als Einzelpersonen: Name, Alter, Geschlecht, Partner; Spielstart mit 4 Paaren; deutsche mittelalterliche Namen aus einem Generator mit Seed
- [x] Essen und Trinken: Bedürfnisse Brot und Wasser (0 bis 100), täglicher Verbrauch aus dem Lager, sinkende Werte bei Mangel
- [x] Gebäude: Gebäudetypen mit Kosten in Holz und Stein, Bauzeit und Arbeitsplätzen; Bauauftrag, der automatisch über die Zeit fertig wird; Spielstart mit 2 Wohnhäusern
- [x] Produktion der 5 Startberufe (Wasserträger, Bauer, Müller, Bäcker, Holzfäller): Arbeiter in ihrem Gebäude verbrauchen pro Stunde Eingangswaren aus dem Lager und erzeugen Ausgangswaren; Bauer produziert vorerst ganzjährig
- [x] Berufszuteilung: Wunschzahlen pro Beruf, automatische Verteilung freier Erwachsener auf freie Arbeitsplätze, einzelne Personen fest einem Beruf zuordnen

## Schritt 3: Verwaltungsoberfläche (erste spielbare Version)

- [x] Grundlayout der Verwaltungsoberfläche: Kopfzeile mit Uhr und Steuerung, Bereiche für Lager, Bewohner, Gebäude; funktioniert ab Handybreite
- [x] Bewohnerliste: Name, Alter, Beruf, Bedürfnisbalken; Beruf per Oberfläche festlegen oder freigeben; Wunschzahlen pro Beruf einstellen
- [x] Gebäude-Panel: Gebäude in Auftrag geben (mit Kosten und Bauzeit), Baufortschritt, Belegung der Arbeitsplätze
- [x] Chronik: Meldungen des Simulationskerns (z.B. „Mehl ist ausgegangen“, „Mühle fertig gebaut“) als Liste in der Oberfläche
- [x] Spielbarer Start: Ohne Eingreifen arbeitet am Start niemand (alle Wunschzahlen 0, keine Arbeitsgebäude) und nach 5 Tagen ist das Wasser aus. Sinnvolle Start-Wunschzahlen setzen und sicherstellen, dass ein Spieler Brunnen und Bäckerei bauen und besetzen kann, bevor Wasser und Brot ausgehen (Startwerte aus `docs/vision.md` Abschnitt 10)
- [x] Korrekturen: Bei 200 % Zoom auf 360 px Handybreite ist der „+“-Knopf der Wunschzahl-Zeilen in der Bewohnerliste rechts abgeschnitten (Fund aus 013, Playtest-Screenshot `factory/jobs/013-playable-start/round-1/play/zoom200-3.png`); Layout muss bei 180 px Viewport ohne horizontalen Überlauf funktionieren. Außerdem veraltete doppelte Kommentare über den Test-Fixtures `wellAndField` in `tests/assignment.test.ts` und `withFinishedWell` in `tests/formatResidents.test.ts` entfernen
- [ ] Produktionsketten-Diagramm: zeigt Berufe und Waren als Kette, markiert den aktuellen Engpass (Ware, die fehlt)

## Schritt 4: Jahreszeiten und Winter

- [ ] Weizen und Jahreszeiten: Weizen wächst nur im Frühling und Sommer und wird im Herbst geerntet, im Winter ruht das Feld
- [ ] Wohnraum: Betten in Wohnhäusern zuweisen, Bedürfnis Wohnraum, Obdachlose werden angezeigt
- [ ] Wärme: Holzverbrauch pro bewohntem Haus in Herbst und Winter, Bedürfnis Wärme, ohne Haus keine Wärme
- [ ] Gesundheit: ergibt sich träge aus Brot, Wasser, Wohnraum und Wärme; kranke Bewohner arbeiten langsamer
- [ ] Abwanderung: Bewohner, die mehrere Tage unversorgt sind, verlassen die Burg (Meldung in der Chronik)

## Schritt 5: Lebenslauf

- [ ] Altern und Lebensphasen: Kind (0 bis 3 Jahre, arbeitet nicht), Lehrling (3 bis 5 Jahre, halbe Leistung), Erwachsen
- [ ] Geburten: Paare bekommen Kinder, wenn ein freies Bett, genug Essen und gute Gesundheit vorhanden sind
- [ ] Tod durch Altersschwäche (ab ca. 25 Jahren) und durch Gesundheit, die länger auf 0 steht; Partner werden verwitwet

## Schritt 6: Levelsystem und neue Berufe

- [ ] Erfahrung pro Beruf: Stufe 1 bis 10, Erfahrung pro gearbeiteter Stunde, +10 % Leistung pro Stufe, bleibt beim Berufswechsel erhalten
- [ ] Burgstufen: Bedingungen für Stufe 2 und 3 aus der Vision, Anzeige des Fortschritts, Freischaltung von Gebäuden und Berufen
- [ ] Bergmann und Mine (ab Burgstufe 2): erzeugt Eisenerz und Stein
- [ ] Schmied und Werkzeug (ab Burgstufe 2): Schmiede macht aus Eisenerz und Holz Werkzeug; Werkzeug beschleunigt Bauer, Holzfäller und Bergmann und nutzt sich ab

## Schritt 7: Speichern (erste vollständige Version)

- [ ] Automatisches Speichern jeden Spieltag in `localStorage` und Laden beim Start, mit Versionsnummer im Spielstand
- [ ] Export und Import des Spielstands als JSON-Datei, mit Prüfung der Datei vor dem Laden

## Später (noch nicht für `/factory next`)

Heiler (Kräuter → Heilmittel, Burgstufe 3) · Gebäudestufen · Zufallsereignisse (Missernte, versiegter Brunnen, Feuer) · Belagerungen mit Wachen und Waffen · Markt mit Geld und Preisen · 2D-Karte · Charakter-Modus (eine Person spielen)
