VERDICT: PASS

## Findings
- [minor] src/ui/app.ts (tab hidden): rAF stops in background tabs and the first frame after return is capped, so the player sees time simply continue. This is intended by the spec; no fix needed.
- [minor] src/ui/app.ts pause button: the label change "Pause"/"Weiter" is not announced to screen readers. Acceptable (AC17 forbids aria-live on the clock); the button's own text is read on focus. Optional: none.
- [minor] Not verified in a real browser by the builder; 360 px fit and 44 px targets rest on CSS reading only. Fix: manual check before merge.

## Checked
- Initial display Tag 1, Jahr 1 / Frühling / 00:00 Uhr is rendered by refresh() before the loop starts.
- Pause toggles the text Pause/Weiter; paused state is visible from text, not only color.
- Speed group has role="group" and aria-label "Tempo"; aria-pressed is set on every update; active speed is bold, underlined and dark. Speed change while paused stays paused.
- Buttons are native type="button", built once; only textContent/aria-pressed change, so focus persists.
- Labels use a dl with dt/dd, giving screen readers label/value pairs; no aria-live.
- Wording is short, plain German, and all strings are in src/text/de.ts.
- Focus-visible outline is present; buttons have 44 px minimum size; layout wraps for narrow screens.
