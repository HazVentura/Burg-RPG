VERDICT: PASS

## Findings
- [minor] src/ui/app.ts (buildResidentRow, job and waitingNote spans): the job text and the waiting note are two adjacent spans with no text separator. Screen readers and copied text may read "Ohne ArbeitWartet auf Arbeitsplatz". Fix: put a space or a separator text node between the spans (or make the note a separate dd).
- [minor] src/ui/app.ts (wish number stepper): after "+" or "-" the new number changes silently while focus stays on the button, so a screen-reader user hears nothing. The spec forbids new aria-live regions, so this is by design. Fix (optional): keep as is, or put the wish number in the buttons' aria-label (for example "Bäcker: Wunschzahl erhöhen, jetzt 2"), which is read again on refocus.
- [minor] src/text/de.ts: the pin label is "Zuteilung für <Name>" while the spec example said "Beruf für <Name>". It is visible, names the resident and is understandable, so no change is needed. Consider "Beruf für" for consistency with the "Beruf" row label above it.

## Checked
- Flow: pin and unpin through the select, and wish numbers through "-" and "+", call the core commands and refresh at once, also while paused.
- Failed commands show a German message in one role="alert" element inside the Bewohner area. A successful command clears it. The refresh after a failure resets a select that held a rejected value.
- The "-" button is disabled at 0. "+" has no limit. The buttons have job-specific accessible names.
- Pin with no workplace shows "Ohne Arbeit" plus "Wartet auf Arbeitsplatz". Wish number rows show "x von y Plätzen besetzt" with singular and plural.
- Need bars are labeled meters (label for=id) with the number visible next to them. The number is aria-hidden to avoid double reading. Low and high thresholds are set.
- Semantic markup: ul with aria-label, h3 per resident, dl for age and job. Selects are labeled and disabled for non-adults.
- Focus stays on ticks: rows are updated in place by id and select.value is only set on a real difference.
- Wording is short, plain German and consistent with the existing page. No innerHTML is used.
