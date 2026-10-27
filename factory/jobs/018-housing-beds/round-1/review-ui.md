VERDICT: PASS

## Findings
- [minor] src/ui/styles.css: `.need label` min-width raised from 4rem to 5.5rem for every need row; on very narrow widths the bar gets 1.5rem less room. Fix: none needed at 360px; consider rem tuning only if the bar becomes too short.

## Checked
- No new colors or one-off sizes; only one existing rule changed, new facts reuse the existing fact/value pattern.
- Unterkunft fact follows the same label/value structure as Beruf; Wohnraum bar aligns with Brot and Wasser.
- Summary "Obdachlos" row and house "x von y Betten belegt" status reuse existing summary and status elements; text colors unchanged, so contrast is as before.
- No new interactive elements, so focus states are unaffected.
- Short German strings; no new horizontal overflow expected at 360px (build notes report screenshots at 360, 180 and 1280 px).
