import { BUILDING_TYPES } from "../src/sim/buildings";
import { orderBuilding, setJobTarget, type OrderResult } from "../src/sim/commands";
import { createInitialState, tick, type GameState } from "../src/sim/state";
import { de } from "../src/text/de";
import { formatBedOccupancy, formatBuildOptions, formatBuildingList, formatDuration } from "../src/ui/formatBuildings";
import { formatBuildingSummary } from "../src/ui/formatSummary";

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

function withStorage(state: GameState, wood: number, stone: number): GameState {
  return { ...state, storage: { ...state.storage, wood, stone } };
}

describe("German building names and order errors (AC2)", () => {
  it("names every building type", () => {
    expect(de.buildingTypes).toEqual({
      house: "Wohnhaus",
      well: "Brunnen",
      field: "Feld",
      mill: "Mühle",
      bakery: "Bäckerei",
      woodcutterHut: "Holzfällerhütte",
    });
  });

  it("has a non-empty text for every order failure reason", () => {
    const reasons: Extract<OrderResult, { ok: false }>["reason"][] = ["notEnoughGoods", "unknownBuilding"];
    for (const reason of reasons) expect(de.buildingPanel.orderErrors[reason]).toMatch(/\S/);
  });
});

describe("formatDuration (AC3)", () => {
  it.each([
    [1, "1 Stunde"],
    [12, "12 Stunden"],
    [24, "1 Tag"],
    [48, "2 Tage"],
    [30, "1 Tag 6 Stunden"],
    [25, "1 Tag 1 Stunde"],
    [72, "3 Tage"],
    [0, "0 Stunden"],
  ])("%i hours -> %s", (hours, text) => {
    expect(formatDuration(hours)).toBe(text);
  });
});

describe("formatBuildOptions (AC4)", () => {
  it("offers every type in BUILDING_TYPES order, all affordable at the start", () => {
    const rows = formatBuildOptions(createInitialState(SEED));
    expect(rows.map((row) => row.type)).toEqual([...BUILDING_TYPES]);
    for (const row of rows) {
      expect(row.affordable).toBe(true);
      expect(row.missingText).toBeNull();
    }
  });

  it("shows name, cost, build time and offer per type", () => {
    const rows = formatBuildOptions(createInitialState(SEED));
    const byType = new Map(rows.map((row) => [row.type, row]));
    expect(byType.get("house")).toMatchObject({
      name: "Wohnhaus",
      costText: "20 Holz",
      buildTimeText: "2 Tage",
      offersText: "4 Betten",
    });
    expect(byType.get("mill")).toMatchObject({
      name: "Mühle",
      costText: "15 Holz, 8 Stein",
      buildTimeText: "3 Tage",
      offersText: "2 Arbeitsplätze (Müller)",
    });
    expect(byType.get("well")).toMatchObject({ buildTimeText: "1 Tag", offersText: "2 Arbeitsplätze (Wasserträger)" });
    expect(byType.get("field")).toMatchObject({
      name: "Feld",
      costText: "5 Holz",
      buildTimeText: "12 Stunden",
      offersText: "4 Arbeitsplätze (Bauer)",
    });
  });

  it("names exactly the missing goods and amounts when storage is too small", () => {
    const rows = formatBuildOptions(withStorage(createInitialState(SEED), 10, 6));
    const byType = new Map(rows.map((row) => [row.type, row]));
    // Mill needs 15 Holz, 8 Stein.
    expect(byType.get("mill")).toMatchObject({ affordable: false, missingText: "Es fehlen 5 Holz, 2 Stein" });
    // House needs 20 Holz and no stone, so stone is not named.
    expect(byType.get("house")).toMatchObject({ affordable: false, missingText: "Es fehlen 10 Holz" });
    // Well needs exactly 10 Holz: affordable at the edge.
    expect(byType.get("well")).toMatchObject({ affordable: true, missingText: null });
  });

  it("names only stone when only stone is missing", () => {
    const rows = formatBuildOptions(withStorage(createInitialState(SEED), 50, 5));
    expect(rows.find((row) => row.type === "bakery")).toMatchObject({
      affordable: false,
      missingText: "Es fehlen 3 Stein",
    });
  });
});

describe("formatBuildingList (AC5)", () => {
  it("lists the two starting houses as finished with their beds taken", () => {
    const rows = formatBuildingList(createInitialState(SEED));
    expect(rows.map((row) => row.name)).toEqual(["Wohnhaus 1", "Wohnhaus 2"]);
    for (const row of rows) {
      expect(row).toMatchObject({
        finished: true,
        construction: null,
        occupancy: null,
        bedOccupancy: { taken: 4, beds: 4, text: "4 von 4 Betten belegt" },
        offersText: null,
      });
    }
  });

  it("shows a well's construction progress until it is finished", () => {
    const ordered = ok(orderBuilding(createInitialState(SEED), "well")).state;
    const well = (state: GameState) => formatBuildingList(state).find((row) => row.type === "well");

    expect(well(ordered)).toMatchObject({
      name: "Brunnen 1",
      finished: false,
      construction: { percent: 0, remainingText: "noch 1 Tag" },
      occupancy: null,
      // Under construction it shows what is coming, but no occupancy.
      offersText: "2 Arbeitsplätze (Wasserträger)",
    });

    expect(well(tickTimes(ordered, 12))).toMatchObject({
      construction: { percent: 50, remainingText: "noch 12 Stunden" },
      occupancy: null,
    });

    expect(well(tickTimes(ordered, 24))).toMatchObject({
      finished: true,
      construction: null,
      // The start wish numbers staff the well at once (2 water carriers).
      occupancy: { working: 2, places: 2, text: "2 von 2 Plätzen besetzt" },
      offersText: null,
    });
  });

  it("rounds progress down, so an unfinished building never shows 100 %", () => {
    // A mill takes 72 hours; after 71 it is at 98.6 %.
    const ordered = ok(orderBuilding(createInitialState(SEED), "mill")).state;
    const mill = formatBuildingList(tickTimes(ordered, 71)).find((row) => row.type === "mill");
    expect(mill).toMatchObject({ finished: false, construction: { percent: 98, remainingText: "noch 1 Stunde" } });
    // After 1 hour of 72: 1.39 % -> 1.
    const early = formatBuildingList(tickTimes(ordered, 1)).find((row) => row.type === "mill");
    expect(early?.construction?.percent).toBe(1);
  });

  it("counts workers per building by workplaceId", () => {
    let state = ok(orderBuilding(createInitialState(SEED), "well")).state;
    state = tickTimes(state, 24);
    state = ok(setJobTarget(state, "waterCarrier", 2)).state;
    state = ok(orderBuilding(state, "well")).state;
    state = tickTimes(state, 24);

    const wells = formatBuildingList(state).filter((row) => row.type === "well");
    expect(wells.map((row) => row.name)).toEqual(["Brunnen 1", "Brunnen 2"]);
    expect(wells[0]?.occupancy?.text).toBe("2 von 2 Plätzen besetzt");
    expect(wells[1]?.occupancy?.text).toBe("0 von 2 Plätzen besetzt");
  });

  it("shows the occupancy right after the tick in which a building finishes", () => {
    // The wish number is set before the well exists, so assignJobs staffs it in its finishing tick.
    let state = ok(setJobTarget(createInitialState(SEED), "waterCarrier", 1)).state;
    state = ok(orderBuilding(state, "well")).state;
    state = tickTimes(state, 24);
    const well = formatBuildingList(state).find((row) => row.type === "well");
    expect(well?.occupancy?.text).toBe("1 von 2 Plätzen besetzt");
  });

  it("numbers buildings per type in list order", () => {
    let state = withStorage(createInitialState(SEED), 200, 50);
    for (const type of ["well", "field", "well", "house"] as const) state = ok(orderBuilding(state, type)).state;
    expect(formatBuildingList(state).map((row) => row.name)).toEqual([
      "Wohnhaus 1",
      "Wohnhaus 2",
      "Brunnen 1",
      "Feld 1",
      "Brunnen 2",
      "Wohnhaus 3",
    ]);
  });
});

describe("ordering until goods run out", () => {
  it("fails the second order of the last affordable building with notEnoughGoods", () => {
    const state = withStorage(createInitialState(SEED), 10, 0);
    const first = ok(orderBuilding(state, "well")).state;
    expect(formatBuildOptions(first).find((row) => row.type === "well")?.missingText).toBe("Es fehlen 10 Holz");
    expect(orderBuilding(first, "well")).toEqual({ ok: false, reason: "notEnoughGoods" });
  });
});

describe("formatBuildingSummary stays as it is (AC6)", () => {
  it("still counts finished and building", () => {
    const state = ok(orderBuilding(createInitialState(SEED), "well")).state;
    expect(formatBuildingSummary(state)).toEqual([
      { label: "Fertig", value: "2" },
      { label: "Im Bau", value: "1" },
    ]);
  });
});

describe("bed occupancy of houses (job 018, AC11)", () => {
  it("formats taken beds with the singular only for exactly one bed", () => {
    expect(formatBedOccupancy(3, 4)).toBe("3 von 4 Betten belegt");
    expect(formatBedOccupancy(1, 4)).toBe("1 von 4 Betten belegt");
    expect(formatBedOccupancy(0, 1)).toBe("0 von 1 Bett belegt");
  });

  it("counts the residents whose homeId is the house", () => {
    const start = createInitialState(SEED);
    // Residents 4 to 7 homeless: house 1 keeps 3, house 2 keeps 1.
    const residents = start.residents.map((resident) =>
      resident.id >= 4 && resident.id <= 7 ? { ...resident, homeId: null } : resident,
    );
    const rows = formatBuildingList({ ...start, residents });
    expect(rows.map((row) => row.bedOccupancy?.text)).toEqual(["3 von 4 Betten belegt", "1 von 4 Betten belegt"]);
    expect(rows.map((row) => row.offersText)).toEqual([null, null]);
  });

  it("keeps showing 4 Betten for a house under construction and in the build options", () => {
    const state = ok(orderBuilding(createInitialState(SEED), "house")).state;
    const newHouse = formatBuildingList(state)[2]!;
    expect(newHouse).toMatchObject({ finished: false, bedOccupancy: null, occupancy: null, offersText: "4 Betten" });
    expect(formatBuildOptions(state).find((row) => row.type === "house")?.offersText).toBe("4 Betten");
  });

  it("shows no bed occupancy on work buildings", () => {
    const state = tickTimes(ok(orderBuilding(createInitialState(SEED), "well")).state, 24);
    expect(formatBuildingList(state)[2]).toMatchObject({ type: "well", finished: true, bedOccupancy: null });
  });
});
