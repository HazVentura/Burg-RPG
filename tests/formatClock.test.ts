import { getCalendar } from "../src/sim/calendar";
import { createInitialState, type GameState } from "../src/sim/state";
import { DAYS_PER_SEASON, HOURS_PER_DAY, SEASONS } from "../src/sim/timeConstants";
import { de } from "../src/text/de";
import { formatClock } from "../src/ui/formatClock";

const SEED = 42;
const HOURS_PER_SEASON = HOURS_PER_DAY * DAYS_PER_SEASON;

function stateAt(elapsedHours: number): GameState {
  return { ...createInitialState(SEED), elapsedHours };
}

function textAt(elapsedHours: number) {
  return formatClock(getCalendar(stateAt(elapsedHours)));
}

describe("German season names", () => {
  it("cover every season", () => {
    expect(de.seasons).toEqual({
      spring: "Frühling",
      summer: "Sommer",
      autumn: "Herbst",
      winter: "Winter",
    });
    expect(Object.keys(de.seasons).sort()).toEqual([...SEASONS].sort());
  });
});

describe("formatClock", () => {
  it("formats the initial state", () => {
    expect(formatClock(getCalendar(createInitialState(SEED)))).toEqual({
      date: "Tag 1, Jahr 1",
      season: "Frühling",
      time: "00:00 Uhr",
    });
  });

  it("pads single-digit hours and keeps 23", () => {
    expect(textAt(7).time).toBe("07:00 Uhr");
    expect(textAt(23).time).toBe("23:00 Uhr");
    expect(textAt(24).time).toBe("00:00 Uhr");
  });

  it("shows day 10 of a season", () => {
    expect(textAt(9 * HOURS_PER_DAY + 12)).toEqual({
      date: "Tag 10, Jahr 1",
      season: "Frühling",
      time: "12:00 Uhr",
    });
  });

  it("formats summer, autumn and winter", () => {
    expect(textAt(HOURS_PER_SEASON)).toEqual({ date: "Tag 1, Jahr 1", season: "Sommer", time: "00:00 Uhr" });
    expect(textAt(2 * HOURS_PER_SEASON + 3 * HOURS_PER_DAY + 5)).toEqual({
      date: "Tag 4, Jahr 1",
      season: "Herbst",
      time: "05:00 Uhr",
    });
    expect(textAt(4 * HOURS_PER_SEASON - 1)).toEqual({
      date: "Tag 10, Jahr 1",
      season: "Winter",
      time: "23:00 Uhr",
    });
  });

  it("rolls over into year 2 after 960 ticks", () => {
    expect(textAt(960)).toEqual({ date: "Tag 1, Jahr 2", season: "Frühling", time: "00:00 Uhr" });
    expect(textAt(960 + HOURS_PER_SEASON + 2 * HOURS_PER_DAY + 18)).toEqual({
      date: "Tag 3, Jahr 2",
      season: "Sommer",
      time: "18:00 Uhr",
    });
  });
});
