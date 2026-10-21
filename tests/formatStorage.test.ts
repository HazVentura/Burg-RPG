import { GOODS, type Storage } from "../src/sim/goods";
import { createInitialState } from "../src/sim/state";
import { INITIAL_STORAGE } from "../src/sim/storageConstants";
import { de } from "../src/text/de";
import { formatStorage } from "../src/ui/formatStorage";

const SEED = 42;

describe("formatStorage", () => {
  it("shows the initial storage in GOODS order with German names", () => {
    const rows = formatStorage(createInitialState(SEED).storage);
    expect(rows.map((row) => [row.name, row.amount])).toEqual([
      ["Weizen", "0"],
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
