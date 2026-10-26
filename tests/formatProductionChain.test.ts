import { BUILDING_DEFINITIONS } from "../src/sim/buildingConstants";
import { createInitialState } from "../src/sim/state";
import { de } from "../src/text/de";
import { formatProductionChain, type ChainRow } from "../src/ui/formatProductionChain";
import {
  SEED,
  finished,
  makeResident,
  makeState,
  storageWith,
  waterAndWoodState,
  wheatChainState,
} from "./chainFixtures";

/** "Weizen 0 fehlt" per good, "!" marks a bottleneck: a compact view of one row. */
function describeRow(row: ChainRow): string {
  const goods = (cells: ChainRow["inputs"]) =>
    cells.map((c) => `${c.bottleneck ? "!" : ""}${c.name} ${c.amount}${c.missing ? " fehlt" : ""}`).join(", ");
  return `${goods(row.inputs)} → ${row.name} (${row.detail}) → ${goods(row.outputs)}`;
}

describe("production chain texts (AC7)", () => {
  it("has the area heading and every new string", () => {
    expect(de.productionChain.heading).toBe("Produktionskette");
    expect(de.productionChain.noBottleneck).toBe("Kein Engpass");
    expect(de.productionChain.bottleneckPrefix).toBe("Engpass");
    expect(de.productionChain.missing).toBe("fehlt");
    expect(de.productionChain.working).toBe("bei der Arbeit");
    expect(de.productionChain.residents).toBe("Bewohner");
    expect(de.productionChain.residentsAction).toBe("essen und trinken");
    expect(de.productionChain.listLabel).toMatch(/\S/);
  });
});

describe("formatProductionChain (AC8)", () => {
  it("shows the chain of a new game with no bottleneck", () => {
    const chain = formatProductionChain(createInitialState(SEED));
    expect(chain.bottleneckText).toBe("Kein Engpass");
    expect(chain.hasBottleneck).toBe(false);
    expect(chain.rows.map(describeRow)).toEqual([
      " → Wasserträger (0 bei der Arbeit) → Wasser 40",
      " → Bauer (0 bei der Arbeit) → Weizen 0",
      " → Holzfäller (0 bei der Arbeit) → Holz 50",
      "Weizen 0 → Müller (0 bei der Arbeit) → Mehl 0",
      "Mehl 0, Wasser 40, Holz 50 → Bäcker (0 bei der Arbeit) → Brot 60",
      "Brot 60, Wasser 40 → Bewohner (essen und trinken) → ",
    ]);
    expect(chain.rows.map((row) => row.job)).toEqual(["waterCarrier", "farmer", "woodcutter", "miller", "baker", null]);
  });

  it("marks the wheat chain and names wheat as the bottleneck", () => {
    const chain = formatProductionChain(wheatChainState());
    expect(chain.bottleneckText).toBe("Engpass: Weizen");
    expect(chain.hasBottleneck).toBe(true);
    expect(chain.rows.map(describeRow)).toEqual([
      " → Wasserträger (0 bei der Arbeit) → Wasser 10",
      " → Bauer (0 bei der Arbeit) → !Weizen 0 fehlt",
      " → Holzfäller (0 bei der Arbeit) → Holz 10",
      "!Weizen 0 fehlt → Müller (1 bei der Arbeit) → Mehl 0 fehlt",
      "Mehl 0 fehlt, Wasser 10, Holz 10 → Bäcker (1 bei der Arbeit) → Brot 0 fehlt",
      "Brot 0 fehlt, Wasser 10 → Bewohner (essen und trinken) → ",
    ]);
  });

  it("names several bottlenecks in GOODS order", () => {
    const chain = formatProductionChain(waterAndWoodState());
    expect(chain.bottleneckText).toBe("Engpass: Wasser, Holz");
    const baker = chain.rows.find((row) => row.job === "baker");
    expect(baker === undefined ? "" : describeRow(baker)).toBe(
      "Mehl 10, !Wasser 0 fehlt, !Holz 0 fehlt → Bäcker (1 bei der Arbeit) → Brot 10",
    );
  });

  it("marks exactly the goods named in the bottleneck line", () => {
    for (const state of [createInitialState(SEED), wheatChainState(), waterAndWoodState()]) {
      const chain = formatProductionChain(state);
      const marked = new Set(
        chain.rows.flatMap((row) => [...row.inputs, ...row.outputs]).filter((c) => c.bottleneck).map((c) => c.name),
      );
      const named = chain.hasBottleneck
        ? chain.bottleneckText.replace(`${de.productionChain.bottleneckPrefix}: `, "").split(", ")
        : [];
      expect([...marked].sort()).toEqual([...named].sort());
    }
  });

  it("counts workers with the capacity limit of production", () => {
    const places = BUILDING_DEFINITIONS.field.workplaces;
    const residents = Array.from({ length: places + 1 }, (_, i) => makeResident(i + 1, 3));
    const buildings = [finished(3, "field"), finished(4, "field")];
    residents.push(makeResident(20, 4), makeResident(21, null));
    const chain = formatProductionChain(makeState(buildings, residents, storageWith({ bread: 99, water: 99 })));
    expect(chain.rows.find((row) => row.job === "farmer")?.detail).toBe(`${places + 1} bei der Arbeit`);
  });

  it("rounds amounts down like the storage panel", () => {
    const state = makeState([], [], storageWith({ water: 0.875, bread: 12.5 }));
    const residents = formatProductionChain(state).rows.at(-1);
    expect(residents?.inputs.map((c) => [c.good, c.amount])).toEqual([
      ["bread", "12"],
      ["water", "0"],
    ]);
  });

  it("leaves out goods no step uses or makes", () => {
    const goods = formatProductionChain(createInitialState(SEED)).rows.flatMap((row) =>
      [...row.inputs, ...row.outputs].map((c) => c.good),
    );
    for (const good of ["stone", "ironOre", "tools"] as const) expect(goods).not.toContain(good);
    expect(new Set(goods)).toEqual(new Set(["wheat", "flour", "bread", "water", "wood"]));
  });

  it("does not mutate the state", () => {
    for (const state of [createInitialState(SEED), wheatChainState(), waterAndWoodState()]) {
      const before = structuredClone(state);
      formatProductionChain(state);
      expect(state).toEqual(before);
    }
  });
});
