import { getCalendar, getCalendarAt } from "../src/sim/calendar";
import type { ChronicleEntry, ChronicleKind } from "../src/sim/chronicle";
import { CHRONICLE_MAX_ENTRIES } from "../src/sim/chronicleConstants";
import { orderBuilding } from "../src/sim/commands";
import { createInitialState, tick, type GameState } from "../src/sim/state";
import { HOURS_PER_DAY } from "../src/sim/timeConstants";
import { de } from "../src/text/de";
import { buildingDisplayNames, formatBuildingList } from "../src/ui/formatBuildings";
import { formatChronicle, formatChronicleTime } from "../src/ui/formatChronicle";

const SEED = 42;

function tickTimes(state: GameState, count: number): GameState {
  let current = state;
  for (let i = 0; i < count; i++) current = tick(current);
  return current;
}

function ok<T extends { ok: boolean }>(result: T): Extract<T, { ok: true }> {
  if (!result.ok) throw new Error(`command refused: ${JSON.stringify(result)}`);
  return result as Extract<T, { ok: true }>;
}

describe("chronicle texts (AC8)", () => {
  it("has the area heading, list label and empty text", () => {
    expect(de.chronicle.heading).toBe("Chronik");
    expect(de.chronicle.empty).toBe("Noch keine Ereignisse.");
    expect(de.chronicle.listLabel).toMatch(/\S/);
  });

  it("has a message for every entry kind", () => {
    const kinds: ChronicleKind[] = ["buildingFinished", "goodRanOut"];
    expect(Object.keys(de.chronicle.messages).sort()).toEqual([...kinds].sort());
  });
});

describe("getCalendarAt (AC9)", () => {
  it("matches getCalendar for the same hour", () => {
    const state = tickTimes(createInitialState(SEED), 50);
    expect(getCalendarAt(50)).toEqual(getCalendar(state));
  });
});

describe("formatChronicle (AC9)", () => {
  it("returns no rows for the initial state", () => {
    expect(formatChronicle(createInitialState(SEED))).toEqual([]);
  });

  it("shows the finished well as Brunnen 1 at Tag 2, 00:00 Uhr", () => {
    const state = tickTimes(ok(orderBuilding(createInitialState(SEED), "well")).state, 24);
    expect(formatChronicle(state)).toEqual([
      { key: "0", text: "Brunnen 1 fertig gebaut", timeText: "Tag 2, Jahr 1, Frühling, 00:00 Uhr" },
    ]);
  });

  it("names the second well Brunnen 2, like the building list", () => {
    let state = { ...createInitialState(SEED), storage: { ...createInitialState(SEED).storage, wood: 100 } };
    state = ok(orderBuilding(state, "well")).state;
    state = ok(orderBuilding(state, "well")).state;
    state = tickTimes(state, 24);
    const rows = formatChronicle(state);
    // Both finish in the same tick; list order puts Brunnen 1 first.
    expect(rows.map((row) => row.text)).toEqual(["Brunnen 1 fertig gebaut", "Brunnen 2 fertig gebaut"]);
    const listNames = formatBuildingList(state).filter((row) => row.type === "well").map((row) => row.name);
    expect(listNames).toEqual(["Brunnen 1", "Brunnen 2"]);
  });

  it("words a good that ran out with its German name", () => {
    const entry: ChronicleEntry = { kind: "goodRanOut", hour: 2 * HOURS_PER_DAY + 14, good: "flour" };
    const state: GameState = { ...createInitialState(SEED), chronicle: [entry], nextChronicleId: 1 };
    expect(formatChronicle(state)).toEqual([
      { key: "0", text: "Mehl ist ausgegangen", timeText: "Tag 3, Jahr 1, Frühling, 14:00 Uhr" },
    ]);
  });

  it("shows the 960-tick run newest first: bread, then water", () => {
    const rows = formatChronicle(tickTimes(createInitialState(SEED), 960));
    expect(rows.map((row) => row.text)).toEqual(["Brot ist ausgegangen", "Wasser ist ausgegangen"]);
    expect(rows.map((row) => row.timeText)).toEqual([formatChronicleTime(192), formatChronicleTime(120)]);
    expect(rows.map((row) => row.key)).toEqual(["1", "0"]);
  });

  it("keeps keys stable and unique when the cap drops old entries", () => {
    let state: GameState = { ...createInitialState(SEED), storage: { ...createInitialState(SEED).storage, wood: 10_000 } };
    // Fields take 12 hours; ordering one every hour finishes one per tick after that.
    // Each field has its own number, so a text identifies its entry.
    let textByKey = new Map<string, string>();
    for (let i = 0; i < CHRONICLE_MAX_ENTRIES + 20; i++) {
      state = ok(orderBuilding(state, "field")).state;
      state = tick(state);
      const rows = formatChronicle(state);
      expect(new Set(rows.map((row) => row.key)).size).toBe(rows.length);
      for (const row of rows) {
        const earlier = textByKey.get(row.key);
        if (earlier !== undefined) expect(row.text).toBe(earlier);
      }
      textByKey = new Map(rows.map((row) => [row.key, row.text]));
    }
    const rows = formatChronicle(state);
    expect(rows).toHaveLength(CHRONICLE_MAX_ENTRIES);
    expect(rows[0]?.key).toBe(String(state.nextChronicleId - 1));
  });
});

describe("buildingDisplayNames (AC9)", () => {
  it("gives the same names as the building list", () => {
    let state = { ...createInitialState(SEED), storage: { ...createInitialState(SEED).storage, wood: 200, stone: 50 } };
    for (const type of ["well", "field", "well", "house"] as const) state = ok(orderBuilding(state, type)).state;
    const names = buildingDisplayNames(state.buildings);
    for (const row of formatBuildingList(state)) expect(names.get(row.id)).toBe(row.name);
  });
});
