import {
  advanceClock,
  createClock,
  setPaused,
  setSpeed,
  togglePaused,
  type ClockState,
} from "../src/ui/clock";
import {
  MAX_ELAPSED_MS_PER_UPDATE,
  MS_PER_TICK,
  REAL_MS_PER_GAME_DAY,
  SPEEDS,
  type Speed,
} from "../src/ui/clockConstants";
import { HOURS_PER_DAY } from "../src/sim/timeConstants";

/** Feeds `steps` updates of `stepMs` and sums the ticks. */
function feed(clock: ClockState, stepMs: number, steps: number): { clock: ClockState; ticks: number } {
  let current = clock;
  let ticks = 0;
  for (let i = 0; i < steps; i++) {
    const result = advanceClock(current, stepMs);
    current = result.clock;
    ticks += result.ticks;
  }
  return { clock: current, ticks };
}

describe("clock constants", () => {
  it("match the vision: one game day per real minute at 1x", () => {
    expect(REAL_MS_PER_GAME_DAY).toBe(60_000);
    expect(MS_PER_TICK).toBe(REAL_MS_PER_GAME_DAY / HOURS_PER_DAY);
    expect(MS_PER_TICK).toBe(2_500);
    expect(SPEEDS).toEqual([1, 2, 4]);
    expect(MAX_ELAPSED_MS_PER_UPDATE).toBe(1_000);
  });
});

describe("createClock", () => {
  it("starts running at speed 1 with no carry", () => {
    expect(createClock()).toEqual({ paused: false, speed: 1, carryMs: 0 });
  });

  it("is plain data that survives JSON", () => {
    const clock = createClock();
    expect(JSON.parse(JSON.stringify(clock))).toEqual(clock);
  });
});

describe("advanceClock pacing", () => {
  it.each([
    [1, 24],
    [2, 48],
    [4, 96],
  ] as const)("speed %i gives %i ticks per real minute in 100 ms steps", (speed: Speed, expected) => {
    const { ticks } = feed(setSpeed(createClock(), speed), 100, 600);
    expect(ticks).toBe(expected);
  });

  it("gives 0 ticks after 2 499 ms and 1 tick after 2 500 ms at speed 1", () => {
    // 2 499 ms as 2 x 999 + 501, staying under the per-update cap.
    let result = advanceClock(createClock(), 999);
    let ticks = result.ticks;
    result = advanceClock(result.clock, 999);
    ticks += result.ticks;
    result = advanceClock(result.clock, 501);
    ticks += result.ticks;
    expect(ticks).toBe(0);

    result = advanceClock(result.clock, 1);
    expect(result.ticks).toBe(1);
    expect(result.clock.carryMs).toBe(0);
  });

  it("gives 0 ticks for 0 ms", () => {
    expect(advanceClock(createClock(), 0)).toEqual({ clock: createClock(), ticks: 0 });
  });
});

describe("advanceClock carry", () => {
  it("keeps leftover time across a speed change", () => {
    const first = feed(createClock(), 625, 2);
    expect(first.ticks).toBe(0);
    expect(first.clock.carryMs).toBe(1_250);

    const second = advanceClock(setSpeed(first.clock, 2), 625);
    expect(second.ticks).toBe(1);
    expect(second.clock.carryMs).toBe(0);
  });

  it("does not lose time to frame size", () => {
    // 16 ms frames do not divide 2 500 evenly.
    const { ticks, clock } = feed(createClock(), 16, 625);
    expect(ticks).toBe(4);
    expect(clock.carryMs).toBe(0);
  });

  it("does not mutate its input", () => {
    const clock = Object.freeze({ ...createClock(), carryMs: 1_000 });
    const result = advanceClock(clock, 800);
    expect(clock).toEqual({ paused: false, speed: 1, carryMs: 1_000 });
    expect(result.clock).not.toBe(clock);
    expect(result.clock.carryMs).toBe(1_800);
  });
});

describe("advanceClock while paused", () => {
  it("returns 0 ticks and keeps the carry", () => {
    const paused = setPaused({ ...createClock(), carryMs: 1_200 }, true);
    for (const ms of [0, 16, 1_000, 600_000]) {
      const result = advanceClock(paused, ms);
      expect(result.ticks).toBe(0);
      expect(result.clock.carryMs).toBe(1_200);
    }
  });

  it("does not build up 10 minutes of paused time", () => {
    const paused = feed(setPaused(createClock(), true), 100, 6_000);
    expect(paused.ticks).toBe(0);

    const resumed = feed(setPaused(paused.clock, false), 100, 25);
    expect(resumed.ticks).toBe(1);
  });
});

describe("advanceClock cap and invalid input", () => {
  it("caps one long update at speed 4 to exactly 1 tick", () => {
    const result = advanceClock(setSpeed(createClock(), 4), 600_000);
    expect(result.ticks).toBe(1);
    expect(result.clock.carryMs).toBe(MAX_ELAPSED_MS_PER_UPDATE * 4 - MS_PER_TICK);
  });

  it("treats anything above the cap as the cap", () => {
    const capped = advanceClock(createClock(), MAX_ELAPSED_MS_PER_UPDATE);
    const above = advanceClock(createClock(), MAX_ELAPSED_MS_PER_UPDATE + 1);
    expect(above).toEqual(capped);
  });

  it.each([-1, -600_000, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    "counts %s ms as 0 and keeps the carry",
    (ms) => {
      const clock = { ...createClock(), carryMs: 1_500 };
      const result = advanceClock(clock, ms);
      expect(result.ticks).toBe(0);
      expect(result.clock.carryMs).toBe(1_500);
    },
  );
});

describe("setPaused, togglePaused and setSpeed", () => {
  it("pausing keeps the speed and returns a new object", () => {
    const fast = setSpeed(createClock(), 4);
    const paused = setPaused(fast, true);
    expect(paused).toEqual({ paused: true, speed: 4, carryMs: 0 });
    expect(paused).not.toBe(fast);
    expect(fast.paused).toBe(false);
  });

  it("setSpeed keeps paused and does not resume", () => {
    const paused = setPaused(createClock(), true);
    const faster = setSpeed(paused, 2);
    expect(faster).toEqual({ paused: true, speed: 2, carryMs: 0 });
    expect(paused.speed).toBe(1);
  });

  it("setSpeed keeps a running clock running", () => {
    expect(setSpeed(createClock(), 2).paused).toBe(false);
  });

  it("togglePaused flips paused and back", () => {
    const once = togglePaused(createClock());
    expect(once.paused).toBe(true);
    expect(togglePaused(once).paused).toBe(false);
  });
});
