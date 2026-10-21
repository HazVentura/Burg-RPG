// Turns residents and buildings into the label/value pairs the Bewohner and
// Gebäude areas show. Pure and DOM-free so the counts can be unit-tested.

import { isFinished } from "../sim/buildings";
import type { GameState } from "../sim/state";
import { de } from "../text/de";

export interface SummaryRow {
  label: string;
  value: string;
}

export function formatResidentSummary(state: GameState): SummaryRow[] {
  return [{ label: de.residents.countLabel, value: String(state.residents.length) }];
}

/** Houses count as buildings. Zero is shown too, so the rows never change shape. */
export function formatBuildingSummary(state: GameState): SummaryRow[] {
  const finished = state.buildings.filter(isFinished).length;
  return [
    { label: de.buildings.finishedLabel, value: String(finished) },
    { label: de.buildings.underConstructionLabel, value: String(state.buildings.length - finished) },
  ];
}
