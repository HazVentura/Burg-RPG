# Build: 018-housing-beds

## Round 1
- What changed:
  - `src/sim/housing.ts` (new): `assignHomes(state)`: clear invalid homes, keep valid ones in resident order while beds last, place the rest in the first finished house (buildings order) with a free bed; returns the input when nothing changes.
  - `src/sim/residents.ts`: `homeId: number | null` on `Resident`, `null` in `createSettler`.
  - `src/sim/needs.ts`: `housing` key in `Needs` and `createFullNeeds`; new `updateHousingNeed(residents)`, kept out of the goods loop.
  - `src/sim/needConstants.ts`: `HOUSING_DROP_PER_DAY_WITHOUT = 15` with a comment on why.
  - `src/sim/state.ts`: `createInitialState` runs `assignHomes`; `advanceHour` runs it after construction and before the midnight step, which now also calls `updateHousingNeed`; order comment updated (6 steps).
  - `src/ui/buildingNames.ts` (new): `buildingDisplayNames` moved here so `formatResidents` can use it without a circular import with `formatBuildings` (which re-exports it, so existing imports still work).
  - `src/ui/formatResidents.ts`: `NEED_ORDER` adds `housing`; new `ResidentRow.homeText` ("Wohnhaus 2" / "Obdachlos").
  - `src/ui/formatSummary.ts`: second row "Obdachlos" with the homeless count, always shown.
  - `src/ui/formatBuildings.ts`: `formatBedOccupancy` (sibling of `formatOccupancy`) and `BuildingRow.bedOccupancy` for finished houses; `offersText` is null once a house is finished. Build options unchanged.
  - `src/ui/app.ts`: "Unterkunft" fact after Beruf, built once and updated via `textContent`; building status falls back to `bedOccupancy.text`.
  - `src/ui/styles.css`: `.need label` min-width 4rem -> 5.5rem so the Wohnraum bar lines up with Brot and Wasser (no new color).
  - `src/text/de.ts`: `needs.housing` "Wohnraum", `residents.homelessLabel`, `residentList.homeLabel`/`homeless`, `buildingPanel.bedsOf`/`bedsTaken`.
- AC1: `tests/housing.test.ts` "Resident.homeId (AC1)" (JSON round trip, no new GameState key); key list in `tests/residents.test.ts`.
- AC2: `tests/housing.test.ts` "assignHomes (AC2)": 10 residents/2 houses, beds from definition, unfinished house, work buildings, invalid ids (unknown, well, unfinished house), keep house 2 over free house 1, overflow, buildings order, children, capacity, idempotence, no mutation + shared objects, same state when unchanged, only homeId changes.
- AC3: `tests/housing.test.ts` "createInitialState gives every settler a bed (AC3)" for seeds 42, 0, -1, 7; rngState/names/ages/partners still pinned in `tests/needs.test.ts` and `tests/state.test.ts`.
- AC4: `tests/housing.test.ts` "bed assignment in tick (AC4)": third house finishes and takes residents 9 and 10 in the same tick; house finishing on the step into midnight counts that night. Order comment in `src/sim/state.ts` `tick`.
- AC5: `tests/housing.test.ts` "starts full and is not a consumed good"; `tests/needs.test.ts` starting needs.
- AC6: `tests/housing.test.ts` "Wohnraum need": 85/70/0 with `toBe`, 40 until hour 48 then 100, unchanged between midnights, clamp, constant value 15.
- AC7: existing food tests unchanged in substance; `tests/opening.test.ts` `expectWinnable` now also checks `housing` is 100 for all 8 after every midnight (covers the day-30 scenario).
- AC8: `tests/formatResidents.test.ts` "shows Wohnraum as the third need bar", need lists updated.
- AC9: `tests/formatResidents.test.ts` "names the house a resident sleeps in", "shows Obdachlos ...".
- AC10: `tests/formatSummary.test.ts` start state `[["Anzahl","8"],["Obdachlos","0"]]` and "counts the residents without a bed".
- AC11: `tests/formatBuildings.test.ts` "bed occupancy of houses (job 018, AC11)": "3 von 4 Betten belegt", "1 von 4 Betten belegt", "0 von 1 Bett belegt", house under construction and build option keep "4 Betten", work buildings without bed occupancy.
- AC12: all texts in `src/text/de.ts`; no new color or live region. Checked screenshots at 360, 180 and 1280 px: nothing overflows, bars aligned.
- AC13/AC14: new `tests/housing.test.ts`; fixtures (`chainFixtures`, `chronicle`, `assignment`, `production`, `residents`, `needs`) get `housing` and `homeId`; `de.needs`, summary, house text and state shape tests updated, none deleted.
- Test run: `npm test`, 495 tests, all passing. `npm run build` passes, no new dependencies.
