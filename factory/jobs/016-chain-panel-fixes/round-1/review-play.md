VERDICT: PASS

## Findings
- [minor] At 180 px the resident name "Hildebrand" breaks mid-word as "Hildebran / d" in the Bewohner panel. Out of scope per the spec (report only). Evidence: round-1/play/zoom200-2.png. Fix: separate job, for example a smaller name font or soft hyphens.
- [minor] Day 10 to 30: the bakery has no workers (wish number 0), so Brot stays 0 while Mehl and Weizen pile up (Weizen 372, Mehl 302 on day 30). The line shows only "Engpass: Holz (keine Holzfällerhütte)"; bread is not named. This follows the job 015 rules and is out of scope here. Evidence: sim log, day 30. Fix: a later job could name "kein Bäcker".

## Played
Seed 42, 35 days. Ordered Brunnen, Feld, Mühle and Bäckerei on day 2. Printed the bottleneck line every 5 days. It read "Kein Engpass" while stock lasted. Later it read "Engpass: Holz (keine Holzfällerhütte)", which is correct because no woodcutter hut exists. Stock never went negative.
Screenshots: phone-0..4, zoom200-0..6 and desktop-0..2 in round-1/play. No horizontal overflow at 360 or 180 px. The heading breaks cleanly as "Produktions- / kette" at 180 px (zoom200-0.png, AC1 met) and reads "Produktionskette" at 360 px and on desktop.

## Not checked
- The hidden "Engpass" word for screen readers (needs a screen reader or DOM inspection).
- The bottleneck line with a cause, and the bold frame, in the browser: screenshots show the start-up state ("Kein Engpass") only.
- Behavior after clicks.
