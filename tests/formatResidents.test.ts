import { orderBuilding, setJobTarget, setPinnedJob } from "../src/sim/commands";
import { JOBS } from "../src/sim/jobs";
import { HOURS_PER_DAY, HOURS_PER_YEAR } from "../src/sim/timeConstants";
import { getAgeYears } from "../src/sim/residents";
import { createInitialState, tick, type GameState } from "../src/sim/state";
import { de } from "../src/text/de";
import { formatAge, formatJobTargets, formatOccupancy, formatResidentList } from "../src/ui/formatResidents";

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

/** A finished well after 24 ticks, with every wish number at 0, so each test sets only what it checks. */
function withFinishedWell(): GameState {
  const start: GameState = {
    ...createInitialState(SEED),
    jobTargets: { waterCarrier: 0, farmer: 0, miller: 0, baker: 0, woodcutter: 0 },
  };
  return tickTimes(ok(orderBuilding(start, "well")).state, 24);
}

describe("German job and need names (AC2)", () => {
  it("names every job", () => {
    expect(de.jobs).toEqual({
      waterCarrier: "Wasserträger",
      farmer: "Bauer",
      miller: "Müller",
      baker: "Bäcker",
      woodcutter: "Holzfäller",
    });
  });

  it("names the needs Brot, Wasser and Wohnraum", () => {
    expect(de.needs).toEqual({ bread: "Brot", water: "Wasser", housing: "Wohnraum" });
  });

  it("has a message for every command failure", () => {
    expect(Object.keys(de.residentList.commandErrors).sort()).toEqual(
      ["invalidCount", "notAdult", "unknownJob", "unknownResident"].sort(),
    );
  });
});

describe("formatAge (AC3)", () => {
  it("uses the singular only for exactly one year", () => {
    expect(formatAge(0)).toBe("0 Jahre");
    expect(formatAge(1)).toBe("1 Jahr");
    expect(formatAge(2)).toBe("2 Jahre");
    expect(formatAge(10)).toBe("10 Jahre");
  });
});

describe("formatResidentList (AC3, AC4, AC6)", () => {
  it("lists the 8 settlers in state order, idle, unpinned and fully supplied", () => {
    const state = createInitialState(SEED);
    const rows = formatResidentList(state);
    expect(rows).toHaveLength(8);
    rows.forEach((row, index) => {
      const resident = state.residents[index]!;
      expect(row.id).toBe(resident.id);
      expect(row.name).toBe(resident.name);
      expect(row.ageText).toBe(`${getAgeYears(resident, 0)} Jahre`);
      expect(row.jobText).toBe("Ohne Arbeit");
      expect(row.waitingNote).toBeNull();
      expect(row.pinnedJob).toBeNull();
      expect(row.canPin).toBe(true);
      expect(row.pinLabel).toBe(`Zuteilung für ${resident.name}`);
      expect(row.needs).toEqual([
        { need: "bread", label: "Brot", value: 100, valueText: "100" },
        { need: "water", label: "Wasser", value: 100, valueText: "100" },
        { need: "housing", label: "Wohnraum", value: 100, valueText: "100" },
      ]);
    });
  });

  it("shows Wasserträger for the two residents at a finished well", () => {
    const state = ok(setJobTarget(withFinishedWell(), "waterCarrier", 2)).state;
    const jobs = formatResidentList(state).map((row) => row.jobText);
    expect(jobs.filter((text) => text === "Wasserträger")).toHaveLength(2);
    expect(jobs.filter((text) => text === "Ohne Arbeit")).toHaveLength(6);
  });

  it("marks a resident pinned to miller without a mill as waiting", () => {
    const state = ok(setPinnedJob(withFinishedWell(), 3, "miller")).state;
    const row = formatResidentList(state).find((candidate) => candidate.id === 3)!;
    expect(row.pinnedJob).toBe("miller");
    expect(row.jobText).toBe("Ohne Arbeit");
    expect(row.waitingNote).toBe("Wartet auf Arbeitsplatz");
  });

  it("marks a pinned resident as waiting when every place of the job is taken", () => {
    let state = withFinishedWell();
    for (const id of [1, 2, 3]) state = ok(setPinnedJob(state, id, "waterCarrier")).state;
    const rows = formatResidentList(state);
    expect(rows.slice(0, 3).map((row) => [row.jobText, row.waitingNote])).toEqual([
      ["Wasserträger", null],
      ["Wasserträger", null],
      ["Ohne Arbeit", "Wartet auf Arbeitsplatz"],
    ]);
  });

  it("drops the waiting note once the pin is released, and a kept worker stays", () => {
    let state = ok(setJobTarget(withFinishedWell(), "waterCarrier", 1)).state;
    state = ok(setPinnedJob(state, 5, "waterCarrier")).state;
    state = ok(setPinnedJob(state, 5, null)).state;
    const row = formatResidentList(state).find((candidate) => candidate.id === 5)!;
    expect(row.pinnedJob).toBeNull();
    expect(row.jobText).toBe("Wasserträger");
    expect(row.waitingNote).toBeNull();
  });

  it("shows a need below 100 after days without bread", () => {
    const start = createInitialState(SEED);
    const hungry = tickTimes({ ...start, storage: { ...start.storage, bread: 0 } }, 2 * HOURS_PER_DAY);
    const row = formatResidentList(hungry)[0]!;
    expect(row.needs[0]).toEqual({ need: "bread", label: "Brot", value: 70, valueText: "70" });
    expect(row.needs[1]?.value).toBe(100);
  });

  it("rounds a fractional need down", () => {
    const start = createInitialState(SEED);
    const resident = { ...start.residents[0]!, needs: { bread: 42.7, water: 0.9, housing: 55.5 } };
    const row = formatResidentList({ ...start, residents: [resident] })[0]!;
    expect(row.needs.map((need) => [need.value, need.valueText])).toEqual([
      [42.7, "42"],
      [0.9, "0"],
      [55.5, "55"],
    ]);
  });

  it("uses the singular for a hand-made resident of exactly one year, who cannot be pinned", () => {
    const start = createInitialState(SEED);
    const child = { ...start.residents[0]!, bornAtHour: -HOURS_PER_YEAR };
    const row = formatResidentList({ ...start, residents: [child] })[0]!;
    expect(row.ageText).toBe("1 Jahr");
    expect(row.canPin).toBe(false);
  });

  it("follows the residents in the state, not a fixed count of 8", () => {
    const start = createInitialState(SEED);
    const fewer = { ...start, residents: [start.residents[4]!, start.residents[1]!] };
    expect(formatResidentList(fewer).map((row) => row.id)).toEqual([5, 2]);
  });

  it("does not modify the state it formats", () => {
    const state = ok(setPinnedJob(withFinishedWell(), 2, "baker")).state;
    const before = structuredClone(state);
    formatResidentList(state);
    formatJobTargets(state);
    expect(state).toStrictEqual(before);
  });
});

describe("formatJobTargets (AC5, AC6)", () => {
  const summary = (state: GameState) =>
    formatJobTargets(state).map((row) => [row.job, row.name, row.target, row.working, row.places]);

  it("shows the start wish numbers and no places in the initial state", () => {
    const rows = formatJobTargets(createInitialState(SEED));
    expect(rows.map((row) => row.job)).toEqual([...JOBS]);
    expect(rows.map((row) => row.target)).toEqual([2, 2, 1, 1, 2]);
    for (const row of rows) {
      expect([row.working, row.places, row.canDecrease]).toEqual([0, 0, true]);
      expect(row.occupancyText).toBe("0 von 0 Plätzen besetzt");
    }
  });

  it("counts wish 2, working 2 and places 2 at a finished well", () => {
    const state = ok(setJobTarget(withFinishedWell(), "waterCarrier", 2)).state;
    expect(summary(state)).toEqual([
      ["waterCarrier", "Wasserträger", 2, 2, 2],
      ["farmer", "Bauer", 0, 0, 0],
      ["miller", "Müller", 0, 0, 0],
      ["baker", "Bäcker", 0, 0, 0],
      ["woodcutter", "Holzfäller", 0, 0, 0],
    ]);
    expect(formatJobTargets(state)[0]?.occupancyText).toBe("2 von 2 Plätzen besetzt");
    expect(formatJobTargets(state)[0]?.canDecrease).toBe(true);
  });

  it("allows a wish number above the places", () => {
    const state = ok(setJobTarget(withFinishedWell(), "waterCarrier", 5)).state;
    expect(summary(state)[0]).toEqual(["waterCarrier", "Wasserträger", 5, 2, 2]);
  });

  it("does not count a building under construction as places", () => {
    const ordered = ok(orderBuilding(createInitialState(SEED), "well")).state;
    const state = ok(setJobTarget(ordered, "waterCarrier", 2)).state;
    expect(summary(state)[0]).toEqual(["waterCarrier", "Wasserträger", 2, 0, 0]);
  });

  it("uses the singular for exactly one place", () => {
    expect(formatOccupancy(0, 1)).toBe("0 von 1 Platz besetzt");
    expect(formatOccupancy(1, 1)).toBe("1 von 1 Platz besetzt");
    expect(formatOccupancy(3, 4)).toBe("3 von 4 Plätzen besetzt");
  });

  it("counts pinned workers as working", () => {
    let state = withFinishedWell();
    state = ok(setPinnedJob(state, 1, "waterCarrier")).state;
    expect(summary(state)[0]).toEqual(["waterCarrier", "Wasserträger", 0, 1, 2]);
    // The wish number stays 0, so "−" stays off even though someone works there.
    expect(formatJobTargets(state)[0]?.canDecrease).toBe(false);
  });
});

describe("Unterkunft and Wohnraum in the resident list (job 018, AC8, AC9)", () => {
  it("shows Wohnraum as the third need bar, after Brot and Wasser", () => {
    const row = formatResidentList(createInitialState(SEED))[0]!;
    expect(row.needs.map((need) => need.label)).toEqual(["Brot", "Wasser", "Wohnraum"]);
  });

  it("names the house a resident sleeps in", () => {
    const rows = formatResidentList(createInitialState(SEED));
    expect(rows.map((row) => row.homeText)).toEqual([
      "Wohnhaus 1",
      "Wohnhaus 1",
      "Wohnhaus 1",
      "Wohnhaus 1",
      "Wohnhaus 2",
      "Wohnhaus 2",
      "Wohnhaus 2",
      "Wohnhaus 2",
    ]);
  });

  it("shows Obdachlos for a resident without a bed, and a low Wohnraum value", () => {
    const start = createInitialState(SEED);
    const homeless = { ...start.residents[0]!, homeId: null, needs: { ...start.residents[0]!.needs, housing: 70 } };
    const row = formatResidentList({ ...start, residents: [homeless] })[0]!;
    expect(row.homeText).toBe("Obdachlos");
    expect(row.needs[2]).toEqual({ need: "housing", label: "Wohnraum", value: 70, valueText: "70" });
  });

  it("has the German labels Unterkunft and Obdachlos", () => {
    expect(de.residentList.homeLabel).toBe("Unterkunft");
    expect(de.residentList.homeless).toBe("Obdachlos");
  });
});
