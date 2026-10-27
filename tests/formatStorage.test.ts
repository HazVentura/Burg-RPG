import { GOODS, type Storage } from "../src/sim/goods";
import { createInitialState } from "../src/sim/state";
import { INITIAL_STORAGE } from "../src/sim/storageConstants";
import { de } from "../src/text/de";
import { formatFieldWheat, formatStorage } from "../src/ui/formatStorage";
import type { Building } from "../src/sim/buildings";
import { DAYS_PER_SEASON, HOURS_PER_DAY, SEASONS } from "../src/sim/timeConstants";

const SEED = 42;

describe("formatStorage", () => {
  it("shows the initial storage in GOODS order with German names", () => {
    const rows = formatStorage(createInitialState(SEED).storage);
    expect(rows.map((row) => [row.name, row.amount])).toEqual([
      ["Weizen", "80"],
      ["Mehl", "0"],
      ["Brot", "60"],
      ["Wasser", "40"],
      ["Holz", "50"],
      ["Stein", "20"],
      ["Eisenerz", "0"],
      ["Werkzeug", "0"],
    ]);
    expect(rows.map((row) => row.good)).toEqual([...GOODS]);
  });

  it("rounds fractional amounts down", () => {
    const storage: Storage = { ...INITIAL_STORAGE, bread: 12.9, water: 0.5, wood: 0.999 };
    const rows = formatStorage(storage);
    const amountOf = (name: string) => rows.find((row) => row.name === name)?.amount;
    expect(amountOf("Brot")).toBe("12");
    expect(amountOf("Wasser")).toBe("0");
    expect(amountOf("Holz")).toBe("0");
  });

  it("does not modify the storage it formats", () => {
    const storage: Storage = { ...INITIAL_STORAGE, bread: 12.9 };
    const before = structuredClone(storage);
    formatStorage(storage);
    expect(storage).toEqual(before);
  });
});

describe("German good names", () => {
  it("names every good", () => {
    expect(de.goods).toEqual({
      wheat: "Weizen",
      flour: "Mehl",
      bread: "Brot",
      water: "Wasser",
      wood: "Holz",
      stone: "Stein",
      ironOre: "Eisenerz",
      tools: "Werkzeug",
    });
  });

  it("names the storage panel", () => {
    expect(de.storage.heading).toBe("Lager");
  });
});

describe("formatFieldWheat (job 017, AC11)", () => {
  const field: Building = { id: 3, type: "field", hoursLeft: 0 };

  function withFields(buildings: Building[], fieldWheat: number, elapsedHours = 0) {
    const initial = createInitialState(SEED);
    return { ...initial, buildings: [...initial.buildings, ...buildings], elapsedHours, fieldWheat };
  }

  it("is hidden (null) without a finished field", () => {
    expect(formatFieldWheat(createInitialState(SEED))).toBeNull();
    expect(formatFieldWheat(withFields([{ id: 3, type: "field", hoursLeft: 4 }], 10))).toBeNull();
    expect(formatFieldWheat(withFields([{ id: 3, type: "well", hoursLeft: 0 }], 10))).toBeNull();
  });

  it("shows the amount and the phase once a field is finished", () => {
    expect(formatFieldWheat(withFields([field], 120))).toBe("Auf den Feldern: 120 Weizen, wächst");
    expect(formatFieldWheat(withFields([field], 0))).toBe("Auf den Feldern: 0 Weizen, wächst");
  });

  it("rounds the amount down like the storage rows", () => {
    expect(formatFieldWheat(withFields([field], 12.9))).toBe("Auf den Feldern: 12 Weizen, wächst");
    expect(formatFieldWheat(withFields([field], 0.5))).toBe("Auf den Feldern: 0 Weizen, wächst");
  });

  it("names the phase by the season of the coming tick", () => {
    const phases = SEASONS.map((_, index) => {
      const line = formatFieldWheat(withFields([field], 7, index * DAYS_PER_SEASON * HOURS_PER_DAY + 5));
      return line?.split(", ")[1];
    });
    expect(phases).toEqual(["wächst", "wächst", "Erntezeit", "Feld ruht"]);
    // Hour 479 starts the last summer tick, hour 480 the first autumn tick.
    expect(formatFieldWheat(withFields([field], 7, 479))).toBe("Auf den Feldern: 7 Weizen, wächst");
    expect(formatFieldWheat(withFields([field], 7, 480))).toBe("Auf den Feldern: 7 Weizen, Erntezeit");
  });

  it("has a phase text for every season", () => {
    expect(de.storage.fieldPhases).toEqual({ spring: "wächst", summer: "wächst", autumn: "Erntezeit", winter: "Feld ruht" });
    expect(de.storage.fieldsPrefix).toBe("Auf den Feldern");
  });

  it("does not modify the state it formats", () => {
    const state = withFields([field], 3.5, 500);
    const before = structuredClone(state);
    formatFieldWheat(state);
    expect(state).toEqual(before);
  });
});
