VERDICT: PASS

## Findings
- [minor] src/ui/app.ts buildStorageView: the section has both a visible h2 and aria-labelledby, which is correct. The 8 goods show in a grid that reads row by row (Weizen, Mehl / Brot, Wasser ...). Fix: none needed; optional only.
- [minor] Not run in a browser (builder says so too). Layout at 360 px was checked by arithmetic only (2 x 8rem + 1.5rem gap fits 294 px). Fix: a human glance at `npm run dev` before merge.

## Checked
- Panel sits below the clock, heading "Lager", all eight goods in GOODS order including zeros, start values shown after the first refresh.
- Name and amount are tied through dl/dt/dd; tabular digits on amounts.
- Panel is built once; refresh only sets textContent; no aria-live, so screen readers are not flooded; clock buttons are not rebuilt, so focus is kept.
- Fractional stock is rounded down, so 0.5 never reads as available.
- All strings are German and come from de.ts; wording is short and plain and matches the clock.
- No error or empty states apply: the panel is read-only and has no input.
