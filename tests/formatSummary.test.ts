import { getBuildingDefinition } from "../src/sim/buildingConstants";
import { orderBuilding } from "../src/sim/commands";
import { createInitialState, tick, type GameState } from "../src/sim/state";
import { de } from "../src/text/de";
import { formatBuildingSummary, formatResidentSummary } from "../src/ui/formatSummary";

const SEED = 42;

function tickTimes(state: GameState, count: number): GameState {
  let current = state;
  for (let i = 0; i < count; i++) {
    current = tick(current);
  }
  return current;
}

function withOrderedField(state: GameState): GameState {
  const result = orderBuilding(state, "field");
  if (!result.ok) {
    throw new Error(`field order refused: ${result.reason}`);
  }
  return result.state;
}

const pairs = (rows: { label: string; value: string }[]) => rows.map((row) => [row.label, row.value]);

describe("formatResidentSummary", () => {
  it("shows 8 residents right after load", () => {
    expect(pairs(formatResidentSummary(createInitialState(SEED)))).toEqual([["Anzahl", "8"]]);
  });

  it("follows the number of residents in the state", () => {
    const state = createInitialState(SEED);
    const fewer = { ...state, residents: state.residents.slice(0, 3) };
    expect(pairs(formatResidentSummary(fewer))).toEqual([["Anzahl", "3"]]);
  });
});

describe("formatBuildingSummary", () => {
  it("shows the two finished start houses and nothing under construction", () => {
    expect(pairs(formatBuildingSummary(createInitialState(SEED)))).toEqual([
      ["Fertig", "2"],
      ["Im Bau", "0"],
    ]);
  });

  it("counts an ordered field as under construction", () => {
    const state = withOrderedField(createInitialState(SEED));
    expect(pairs(formatBuildingSummary(state))).toEqual([
      ["Fertig", "2"],
      ["Im Bau", "1"],
    ]);
  });

  it("counts the field as finished once its build hours have passed", () => {
    const ordered = withOrderedField(createInitialState(SEED));
    const hours = getBuildingDefinition("field").buildHours;
    expect(pairs(formatBuildingSummary(tickTimes(ordered, hours - 1)))).toEqual([
      ["Fertig", "2"],
      ["Im Bau", "1"],
    ]);
    expect(pairs(formatBuildingSummary(tickTimes(ordered, hours)))).toEqual([
      ["Fertig", "3"],
      ["Im Bau", "0"],
    ]);
  });

  it("does not modify the state it formats", () => {
    const state = withOrderedField(createInitialState(SEED));
    const before = structuredClone(state);
    formatResidentSummary(state);
    formatBuildingSummary(state);
    expect(state).toEqual(before);
  });
});

describe("German area texts", () => {
  it("names the Bewohner and Gebäude areas and their values", () => {
    expect(de.residents).toEqual({ heading: "Bewohner", countLabel: "Anzahl" });
    expect(de.buildings).toEqual({ heading: "Gebäude", finishedLabel: "Fertig", underConstructionLabel: "Im Bau" });
  });
});
