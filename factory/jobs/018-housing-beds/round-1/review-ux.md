VERDICT: PASS

## Findings
- [minor] src/ui/formatResidents.ts `homeText`: if a resident's homeId points to a building id missing from the name map, the row falls back to "Obdachlos" although `homeId` is not null, so the list and the summary count could disagree. Fix: not needed now (assignHomes clears invalid ids and buildings are never removed); leave as is.
- [minor] src/ui/app.ts building status: the "x von y Betten belegt" text changes silently, with no live region. Fix: none, since the spec forbids a new live region.

## Checked
- Flow: start state shows 8 residents, Obdachlos 0, each row with Unterkunft "Wohnhaus 1" or "Wohnhaus 2", and Wohnraum at 100.
- AC8/AC9: the Wohnraum bar comes third, after Brot and Wasser. Unterkunft follows Beruf and is built once, with only textContent updated.
- AC10: the Obdachlos summary row always appears, including at 0, so the layout does not shift.
- AC11: a finished house shows "x von 4 Betten belegt" with the singular for 1 bed. Houses under construction and build options keep "4 Betten".
- Wording: short and plain, in German, taken from de.ts and consistent with the existing "x von y Plätzen besetzt".
- Empty and edge states: a homeless resident reads "Obdachlos", and the Wohnraum bar drops by 15 per midnight. The player can see when another house is needed.
- Accessibility: the new bar reuses the existing labelled meter pattern. No new live region and no color-only signal, because the text "Obdachlos" accompanies the bar. The label min-width change keeps the bars aligned.
