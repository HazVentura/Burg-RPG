// The UI reads simulation state and sends commands; it never mutates state directly.
// The page is built once; afterwards only textContent and aria-pressed change,
// so buttons keep keyboard focus while the clock runs.

import { getCalendar } from "../sim/calendar";
import { GOODS, type Good } from "../sim/goods";
import { tick, type GameState } from "../sim/state";
import { de } from "../text/de";
import { advanceClock, createClock, setSpeed, togglePaused, type ClockState } from "./clock";
import { SPEEDS, type Speed } from "./clockConstants";
import { formatClock } from "./formatClock";
import { formatStorage } from "./formatStorage";

interface ClockView {
  date: HTMLElement;
  season: HTMLElement;
  time: HTMLElement;
  pauseButton: HTMLButtonElement;
  speedButtons: Map<Speed, HTMLButtonElement>;
}

interface StorageView {
  /** Amount element per good, built once and updated in place on every refresh. */
  amounts: Map<Good, HTMLElement>;
}

export function renderApp(root: HTMLElement, initialState: GameState): void {
  let state = initialState;
  let clock: ClockState = createClock();

  const main = document.createElement("main");
  const title = document.createElement("h1");
  title.textContent = de.title;
  const tagline = document.createElement("p");
  tagline.textContent = de.tagline;

  const view = buildClockView();
  const storageView = buildStorageView();
  main.append(title, tagline, view.section, storageView.section);
  root.replaceChildren(main);

  const refresh = (): void => {
    updateClockView(view, state, clock);
    updateStorageView(storageView, state);
  };

  view.pauseButton.addEventListener("click", () => {
    clock = togglePaused(clock);
    refresh();
  });
  for (const [speed, button] of view.speedButtons) {
    button.addEventListener("click", () => {
      clock = setSpeed(clock, speed);
      refresh();
    });
  }

  refresh();
  startLoop((elapsedMs) => {
    const result = advanceClock(clock, elapsedMs);
    clock = result.clock;
    if (result.ticks === 0) {
      return;
    }
    for (let i = 0; i < result.ticks; i++) {
      state = tick(state);
    }
    refresh();
  });
}

/**
 * Calls onFrame with the real milliseconds since the previous frame.
 * Uses the requestAnimationFrame timestamp, which is monotonic, unlike Date.now().
 * The first frame reports 0; long gaps are capped later by advanceClock.
 */
function startLoop(onFrame: (elapsedMs: number) => void): void {
  let previous: number | undefined;
  const frame = (now: DOMHighResTimeStamp): void => {
    onFrame(previous === undefined ? 0 : now - previous);
    previous = now;
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

function buildClockView(): ClockView & { section: HTMLElement } {
  const section = document.createElement("section");
  section.className = "clock";
  section.setAttribute("aria-label", de.clock.sectionLabel);

  // Deliberately no aria-live: hourly updates would interrupt screen readers.
  const list = document.createElement("dl");
  list.className = "clock-values";
  const date = addValue(list, de.clock.dateLabel);
  const season = addValue(list, de.clock.seasonLabel);
  const time = addValue(list, de.clock.timeLabel);

  const controls = document.createElement("div");
  controls.className = "clock-controls";

  const pauseButton = makeButton("clock-pause");

  const speedGroup = document.createElement("div");
  speedGroup.className = "clock-speeds";
  speedGroup.setAttribute("role", "group");
  speedGroup.setAttribute("aria-label", de.clock.speedGroupLabel);

  const speedButtons = new Map<Speed, HTMLButtonElement>();
  for (const speed of SPEEDS) {
    const button = makeButton("clock-speed");
    button.textContent = de.clock.speeds[speed];
    speedGroup.append(button);
    speedButtons.set(speed, button);
  }

  controls.append(pauseButton, speedGroup);
  section.append(list, controls);
  return { section, date, season, time, pauseButton, speedButtons };
}

function buildStorageView(): StorageView & { section: HTMLElement } {
  const section = document.createElement("section");
  section.className = "storage";
  const heading = document.createElement("h2");
  heading.id = "storage-heading";
  heading.textContent = de.storage.heading;
  section.setAttribute("aria-labelledby", heading.id);

  // Deliberately no aria-live, like the clock: stock changes every hour later on.
  const list = document.createElement("dl");
  list.className = "storage-values";
  const amounts = new Map<Good, HTMLElement>();
  for (const good of GOODS) {
    amounts.set(good, addValue(list, de.goods[good]));
  }

  section.append(heading, list);
  return { section, amounts };
}

function addValue(list: HTMLDListElement, label: string): HTMLElement {
  const item = document.createElement("div");
  const term = document.createElement("dt");
  term.textContent = label;
  const value = document.createElement("dd");
  item.append(term, value);
  list.append(item);
  return value;
}

function makeButton(className: string): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  return button;
}

function updateClockView(view: ClockView, state: GameState, clock: ClockState): void {
  const text = formatClock(getCalendar(state));
  view.date.textContent = text.date;
  view.season.textContent = text.season;
  view.time.textContent = text.time;

  view.pauseButton.textContent = clock.paused ? de.clock.resume : de.clock.pause;
  for (const [speed, button] of view.speedButtons) {
    button.setAttribute("aria-pressed", String(speed === clock.speed));
  }
}

function updateStorageView(view: StorageView, state: GameState): void {
  for (const row of formatStorage(state.storage)) {
    const amount = view.amounts.get(row.good);
    if (amount !== undefined) {
      amount.textContent = row.amount;
    }
  }
}
