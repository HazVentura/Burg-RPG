import { getCalendar, type Calendar } from "../src/sim/calendar";
import { createInitialState, tick, type GameState } from "../src/sim/state";
import {
  DAYS_PER_SEASON,
  HOURS_PER_DAY,
  SEASONS,
  SEASONS_PER_YEAR,
} from "../src/sim/timeConstants";

const SEED = 42;

function tickTimes(state: GameState, count: number): GameState {
  let current = state;
  for (let i = 0; i < count; i++) {
    current = tick(current);
  }
  return current;
}

describe("time constants", () => {
  it("match the vision: 24 hours, 10 days per season, 4 seasons", () => {
    expect(HOURS_PER_DAY).toBe(24);
    expect(DAYS_PER_SEASON).toBe(10);
    expect(SEASONS_PER_YEAR).toBe(4);
    expect(SEASONS).toEqual(["spring", "summer", "autumn", "winter"]);
  });
});

describe("getCalendar", () => {
  it("starts in spring, year 1, day 1, hour 0", () => {
    expect(getCalendar(createInitialState(SEED))).toEqual({
      year: 1,
      season: "spring",
      day: 1,
      hour: 0,
    });
  });

  const cases: Array<[number, Calendar]> = [
    [1, { year: 1, season: "spring", day: 1, hour: 1 }],
    [23, { year: 1, season: "spring", day: 1, hour: 23 }],
    [24, { year: 1, season: "spring", day: 2, hour: 0 }],
    [239, { year: 1, season: "spring", day: 10, hour: 23 }],
    [240, { year: 1, season: "summer", day: 1, hour: 0 }],
    [479, { year: 1, season: "summer", day: 10, hour: 23 }],
    [480, { year: 1, season: "autumn", day: 1, hour: 0 }],
    [719, { year: 1, season: "autumn", day: 10, hour: 23 }],
    [720, { year: 1, season: "winter", day: 1, hour: 0 }],
    [959, { year: 1, season: "winter", day: 10, hour: 23 }],
    [960, { year: 2, season: "spring", day: 1, hour: 0 }],
    [961, { year: 2, season: "spring", day: 1, hour: 1 }],
  ];

  it.each(cases)("after %i ticks returns %o", (ticks, expected) => {
    const state = tickTimes(createInitialState(SEED), ticks);
    expect(getCalendar(state)).toEqual(expected);
  });

  it("keeps counting years without an upper limit", () => {
    const hoursPerYear = HOURS_PER_DAY * DAYS_PER_SEASON * SEASONS_PER_YEAR;
    const state: GameState = { ...createInitialState(SEED), elapsedHours: 999 * hoursPerYear };
    expect(getCalendar(state)).toEqual({ year: 1000, season: "spring", day: 1, hour: 0 });
  });

  it("stays within its ranges for every hour of two years", () => {
    let state = createInitialState(SEED);
    for (let i = 0; i < 2 * 960; i++) {
      const { year, season, day, hour } = getCalendar(state);
      expect(year).toBeGreaterThanOrEqual(1);
      expect(SEASONS).toContain(season);
      expect(day).toBeGreaterThanOrEqual(1);
      expect(day).toBeLessThanOrEqual(DAYS_PER_SEASON);
      expect(hour).toBeGreaterThanOrEqual(0);
      expect(hour).toBeLessThan(HOURS_PER_DAY);
      state = tick(state);
    }
  });

  it("does not mutate the state", () => {
    const state = tickTimes(createInitialState(SEED), 300);
    const before = structuredClone(state);
    getCalendar(state);
    expect(state).toEqual(before);
  });
});
