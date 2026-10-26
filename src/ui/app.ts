// The UI reads simulation state and sends commands; it never mutates state directly.
// Layout: a header with title and clock, then a main with one section per area.
// The page is built once; afterwards only textContent, aria-pressed, meter and
// progress values, hidden, disabled and select values change, and list items
// are added for new ids, so controls keep keyboard focus while the clock runs.

import { getCalendar } from "../sim/calendar";
import type { BuildingType } from "../sim/buildings";
import {
  orderBuilding,
  setJobTarget,
  setPinnedJob,
  type SetJobTargetResult,
  type SetPinnedJobResult,
} from "../sim/commands";
import { GOODS, type Good } from "../sim/goods";
import { JOBS, type Job } from "../sim/jobs";
import { tick, type GameState } from "../sim/state";
import { de } from "../text/de";
import { advanceClock, createClock, setSpeed, togglePaused, type ClockState } from "./clock";
import { SPEEDS, type Speed } from "./clockConstants";
import {
  formatBuildOptions,
  formatBuildingList,
  type BuildOptionRow,
  type BuildingRow,
} from "./formatBuildings";
import { formatClock } from "./formatClock";
import { formatStorage } from "./formatStorage";
import { formatJobTargets, formatResidentList, type JobTargetRow, type NeedKey, type ResidentRow } from "./formatResidents";
import { formatBuildingSummary, formatResidentSummary, type SummaryRow } from "./formatSummary";
import { NEED_BAR_HIGH, NEED_BAR_LOW, NEED_BAR_MAX, NEED_BAR_MIN } from "./residentListConstants";

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

interface SummaryView {
  /** Value elements in the order of the formatter's rows, updated in place. */
  values: HTMLElement[];
}

/** The elements of one resident card that refresh changes. */
interface ResidentRowView {
  item: HTMLLIElement;
  name: HTMLElement;
  age: HTMLElement;
  job: HTMLElement;
  waitingNote: HTMLElement;
  needs: Map<NeedKey, { meter: HTMLMeterElement; value: HTMLElement; label: HTMLElement }>;
  pinLabel: HTMLLabelElement;
  pinSelect: HTMLSelectElement;
}

interface ResidentListView {
  list: HTMLUListElement;
  /** Keyed by resident id, so a row survives ticks and other residents coming or going. */
  rows: Map<number, ResidentRowView>;
  /** Called with the resident id and the raw select value. */
  onPin: (residentId: number, value: string) => void;
}

interface JobTargetRowView {
  target: HTMLElement;
  occupancy: HTMLElement;
  decrease: HTMLButtonElement;
}

interface JobTargetView {
  rows: Map<Job, JobTargetRowView>;
}

/** The elements of one building item that refresh changes. */
interface BuildingRowView {
  item: HTMLLIElement;
  /** Shown while under construction, hidden once finished. */
  construction: HTMLElement;
  progress: HTMLProgressElement;
  percent: HTMLElement;
  remaining: HTMLElement;
  /** Occupancy of a finished work building, or what the building offers. */
  status: HTMLElement;
}

interface BuildingListView {
  list: HTMLUListElement;
  /** Keyed by building id; buildings are never removed, so items are only added. */
  rows: Map<number, BuildingRowView>;
}

interface BuildOptionsView {
  /** Missing-goods text per type, the only part of an entry that changes. */
  missing: Map<BuildingType, HTMLElement>;
}

/** Select value for "Automatisch"; every other option value is a Job. */
const NO_PIN = "";

export function renderApp(root: HTMLElement, initialState: GameState): void {
  let state = initialState;
  let clock: ClockState = createClock();

  const header = document.createElement("header");
  header.className = "page-header";
  const title = document.createElement("h1");
  title.textContent = de.title;
  const view = buildClockView();
  header.append(title, view.section);

  // Areas in DOM order Lager, Bewohner, Gebäude; on a phone they stack in this order.
  const main = document.createElement("main");
  main.className = "areas";
  const storageView = buildStorageView();
  const residentView = buildSummaryView(
    "residents-heading",
    de.residents.heading,
    formatResidentSummary(initialState),
  );
  // Order in the Bewohner area: count, error message, resident list, wish numbers.
  const commandError = document.createElement("p");
  commandError.className = "command-error";
  // One of two live regions (the other is in Gebäude); it only speaks after a failed job command.
  commandError.setAttribute("role", "alert");
  // Handlers read `state` when they run, never a value captured at build time.
  const residentListView = buildResidentListView((residentId, value) => {
    // "" is Automatisch; any other string goes to the core as is, which rejects a non-job (unknownJob).
    const job = value === NO_PIN ? null : (value as Job);
    runCommand(setPinnedJob(state, residentId, job));
  });
  const jobTargetView = buildJobTargetView((job, delta) => {
    runCommand(setJobTarget(state, job, state.jobTargets[job] + delta));
  });
  residentView.section.append(commandError, residentListView.list, jobTargetView.section);
  residentView.section.classList.add("area-residents");
  const buildingView = buildSummaryView(
    "buildings-heading",
    de.buildings.heading,
    formatBuildingSummary(initialState),
  );
  // Order in the Gebäude area: counts, error message, building list, build options.
  const orderError = document.createElement("p");
  orderError.className = "command-error";
  // The second live region; it only speaks after a failed order.
  orderError.setAttribute("role", "alert");
  const buildingListView = buildBuildingListView();
  const buildOptionsView = buildBuildOptionsView(formatBuildOptions(initialState), (type) => {
    runOrder(type);
  });
  buildingView.section.append(orderError, buildingListView.list, buildOptionsView.section);
  main.append(storageView.section, residentView.section, buildingView.section);
  root.replaceChildren(header, main);

  const refresh = (): void => {
    updateClockView(view, state, clock);
    updateStorageView(storageView, state);
    updateSummaryView(residentView, formatResidentSummary(state));
    updateResidentListView(residentListView, formatResidentList(state));
    updateJobTargetView(jobTargetView, formatJobTargets(state));
    updateSummaryView(buildingView, formatBuildingSummary(state));
    updateBuildingListView(buildingListView, formatBuildingList(state));
    updateBuildOptionsView(buildOptionsView, formatBuildOptions(state));
  };

  // AC11/AC12: take the new state at once, even while paused; on failure keep
  // the state and say why. Refreshing in both cases also resets a select whose
  // value the core refused.
  function runCommand(result: SetPinnedJobResult | SetJobTargetResult): void {
    if (result.ok) {
      state = result.state;
      commandError.textContent = "";
    } else {
      commandError.textContent = de.residentList.commandErrors[result.reason];
    }
    refresh();
  }

  // AC11: like runCommand, but for orders, and the message goes to the Gebäude
  // area's own alert. Reads `state` when clicked, never at build time.
  function runOrder(type: BuildingType): void {
    const result = orderBuilding(state, type);
    if (result.ok) {
      state = result.state;
      orderError.textContent = "";
    } else {
      orderError.textContent = de.buildingPanel.orderErrors[result.reason];
    }
    refresh();
  }

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
  section.className = "panel clock";
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

/** An area panel: a section labelled by its own h2, with an empty value list below. */
function buildArea(headingId: string, headingText: string): { section: HTMLElement; list: HTMLDListElement } {
  const section = document.createElement("section");
  section.className = "panel area";
  const heading = document.createElement("h2");
  heading.id = headingId;
  heading.textContent = headingText;
  section.setAttribute("aria-labelledby", heading.id);

  // Deliberately no aria-live, like the clock: values change every hour.
  const list = document.createElement("dl");
  list.className = "value-list";
  section.append(heading, list);
  return { section, list };
}

function buildStorageView(): StorageView & { section: HTMLElement } {
  const { section, list } = buildArea("storage-heading", de.storage.heading);
  const amounts = new Map<Good, HTMLElement>();
  for (const good of GOODS) {
    amounts.set(good, addValue(list, de.goods[good]));
  }
  return { section, amounts };
}

/**
 * Builds one value pair per row. The labels are fixed at build time; the
 * formatter always returns the same rows, so refresh only changes the values.
 */
function buildSummaryView(
  headingId: string,
  headingText: string,
  rows: readonly SummaryRow[],
): SummaryView & { section: HTMLElement } {
  const { section, list } = buildArea(headingId, headingText);
  const values = rows.map((row) => addValue(list, row.label));
  return { section, values };
}

function buildResidentListView(onPin: ResidentListView["onPin"]): ResidentListView {
  // Rows are added by the first refresh, so the code never assumes a fixed number of residents.
  const list = document.createElement("ul");
  list.className = "resident-list";
  list.setAttribute("aria-label", de.residentList.listLabel);
  return { list, rows: new Map(), onPin };
}

/** One card per resident. Ids in element ids are numbers, so they need no escaping. */
function buildResidentRow(row: ResidentRow, onPin: ResidentListView["onPin"]): ResidentRowView {
  const item = document.createElement("li");
  item.className = "resident";

  const name = document.createElement("h3");
  name.className = "resident-name";

  const facts = document.createElement("dl");
  facts.className = "resident-facts";
  const age = addValue(facts, de.residentList.ageLabel);
  const jobValue = addValue(facts, de.residentList.jobLabel);
  const job = document.createElement("span");
  const waitingNote = document.createElement("span");
  waitingNote.className = "waiting-note";
  jobValue.append(job, waitingNote);

  const needsBox = document.createElement("div");
  needsBox.className = "resident-needs";
  const needs: ResidentRowView["needs"] = new Map();
  for (const needRow of row.needs) {
    const meterId = `need-${row.id}-${needRow.need}`;
    const need = document.createElement("div");
    need.className = "need";
    const label = document.createElement("label");
    label.htmlFor = meterId;
    const meter = document.createElement("meter");
    meter.id = meterId;
    meter.min = NEED_BAR_MIN;
    meter.max = NEED_BAR_MAX;
    meter.low = NEED_BAR_LOW;
    meter.high = NEED_BAR_HIGH;
    meter.optimum = NEED_BAR_MAX;
    const value = document.createElement("span");
    value.className = "need-value";
    // The number repeats the bar; hidden from screen readers, which already hear the meter value.
    value.setAttribute("aria-hidden", "true");
    need.append(label, meter, value);
    needsBox.append(need);
    needs.set(needRow.need, { meter, value, label });
  }

  const pin = document.createElement("div");
  pin.className = "resident-pin";
  const selectId = `pin-${row.id}`;
  const pinLabel = document.createElement("label");
  pinLabel.htmlFor = selectId;
  const pinSelect = document.createElement("select");
  pinSelect.id = selectId;
  pinSelect.append(makeOption(NO_PIN, de.residentList.automatic));
  for (const jobOption of JOBS) {
    pinSelect.append(makeOption(jobOption, de.jobs[jobOption]));
  }
  const residentId = row.id;
  pinSelect.addEventListener("change", () => onPin(residentId, pinSelect.value));
  pin.append(pinLabel, pinSelect);

  item.append(name, facts, needsBox, pin);
  return { item, name, age, job, waitingNote, needs, pinLabel, pinSelect };
}

function makeOption(value: string, text: string): HTMLOptionElement {
  const option = document.createElement("option");
  option.value = value;
  option.textContent = text;
  return option;
}

function buildJobTargetView(
  onChange: (job: Job, delta: 1 | -1) => void,
): JobTargetView & { section: HTMLElement } {
  const section = document.createElement("div");
  section.className = "job-targets";
  const heading = document.createElement("h3");
  heading.textContent = de.jobTargets.heading;
  const list = document.createElement("ul");
  list.className = "job-target-list";

  const rows = new Map<Job, JobTargetRowView>();
  for (const job of JOBS) {
    const item = document.createElement("li");
    item.className = "job-target";

    const text = document.createElement("div");
    text.className = "job-target-text";
    const name = document.createElement("span");
    name.className = "job-target-name";
    name.textContent = de.jobs[job];
    const occupancy = document.createElement("span");
    occupancy.className = "job-target-occupancy";
    text.append(name, occupancy);

    const stepper = document.createElement("div");
    stepper.className = "job-target-stepper";
    const decrease = makeButton("job-target-button");
    decrease.textContent = de.jobTargets.decreaseSymbol;
    decrease.setAttribute("aria-label", `${de.jobs[job]}: ${de.jobTargets.decrease}`);
    decrease.addEventListener("click", () => onChange(job, -1));
    const value = document.createElement("span");
    value.className = "job-target-value";
    const valueLabel = document.createElement("span");
    valueLabel.className = "job-target-value-label";
    valueLabel.textContent = de.jobTargets.targetLabel;
    const target = document.createElement("span");
    target.className = "job-target-number";
    value.append(valueLabel, " ", target);
    const increase = makeButton("job-target-button");
    increase.textContent = de.jobTargets.increaseSymbol;
    increase.setAttribute("aria-label", `${de.jobs[job]}: ${de.jobTargets.increase}`);
    increase.addEventListener("click", () => onChange(job, 1));
    stepper.append(decrease, value, increase);

    item.append(text, stepper);
    list.append(item);
    rows.set(job, { target, occupancy, decrease });
  }

  section.append(heading, list);
  return { section, rows };
}

function buildBuildingListView(): BuildingListView {
  // Items are added by the first refresh, like the resident list.
  const list = document.createElement("ul");
  list.className = "building-list";
  list.setAttribute("aria-label", de.buildingPanel.listLabel);
  return { list, rows: new Map() };
}

/**
 * One item per building. The progress part and the status line are both built
 * up front; finishing only hides the progress part, so the item is never rebuilt.
 */
function buildBuildingRow(row: BuildingRow): BuildingRowView {
  const item = document.createElement("li");
  item.className = "building";

  // The display name never changes: buildings are never removed, so the running number stays.
  const name = document.createElement("h3");
  name.className = "building-name";
  name.textContent = row.name;

  const construction = document.createElement("div");
  construction.className = "building-construction";
  const progress = document.createElement("progress");
  progress.max = 100;
  progress.setAttribute("aria-label", `${row.name}: ${de.buildingPanel.progressLabelSuffix}`);
  // Percent and remaining time as text, so the bar does not depend on color or shape.
  const progressText = document.createElement("span");
  progressText.className = "building-progress-text";
  const percent = document.createElement("span");
  percent.className = "building-percent";
  const remaining = document.createElement("span");
  remaining.className = "building-remaining";
  progressText.append(percent, " ", remaining);
  construction.append(progress, progressText);

  const status = document.createElement("p");
  status.className = "building-status";

  item.append(name, construction, status);
  return { item, construction, progress, percent, remaining, status };
}

/** Appends items for new building ids and updates every other item in place. */
function updateBuildingListView(view: BuildingListView, rows: readonly BuildingRow[]): void {
  for (const row of rows) {
    let rowView = view.rows.get(row.id);
    if (rowView === undefined) {
      rowView = buildBuildingRow(row);
      view.rows.set(row.id, rowView);
      // New buildings always come last in state.buildings, so appending keeps the order.
      view.list.append(rowView.item);
    }
    updateBuildingRow(rowView, row);
  }
}

function updateBuildingRow(view: BuildingRowView, row: BuildingRow): void {
  view.construction.hidden = row.construction === null;
  if (row.construction !== null) {
    view.progress.value = row.construction.percent;
    view.percent.textContent = `${row.construction.percent} %`;
    view.remaining.textContent = row.construction.remainingText;
  }
  view.status.textContent = row.occupancy?.text ?? row.offersText ?? "";
}

/**
 * The group "Bauen": one entry per building type. Name, cost, build time and
 * offer never change, so they are set here; refresh only updates the missing text.
 */
function buildBuildOptionsView(
  rows: readonly BuildOptionRow[],
  onOrder: (type: BuildingType) => void,
): BuildOptionsView & { section: HTMLElement } {
  const section = document.createElement("div");
  section.className = "build-options";
  const heading = document.createElement("h3");
  heading.id = "build-options-heading";
  heading.textContent = de.buildingPanel.buildHeading;
  section.setAttribute("role", "group");
  section.setAttribute("aria-labelledby", heading.id);
  const list = document.createElement("ul");
  list.className = "build-option-list";

  const missing = new Map<BuildingType, HTMLElement>();
  for (const row of rows) {
    const item = document.createElement("li");
    item.className = "build-option";

    const name = document.createElement("span");
    name.className = "build-option-name";
    name.textContent = row.name;

    const facts = document.createElement("dl");
    facts.className = "build-option-facts";
    addValue(facts, de.buildingPanel.costLabel).textContent = row.costText;
    addValue(facts, de.buildingPanel.buildTimeLabel).textContent = row.buildTimeText;
    addValue(facts, de.buildingPanel.offersLabel).textContent = row.offersText;

    const missingText = document.createElement("p");
    missingText.className = "build-option-missing";

    // Stays enabled when unaffordable, so focus is never lost when stock drops
    // during a tick; a click then reports notEnoughGoods in the alert.
    const button = makeButton("build-option-button");
    button.textContent = `${row.name} ${de.buildingPanel.buildButtonSuffix}`;
    const type = row.type;
    button.addEventListener("click", () => onOrder(type));

    item.append(name, facts, missingText, button);
    list.append(item);
    missing.set(type, missingText);
  }

  section.append(heading, list);
  return { section, missing };
}

function updateBuildOptionsView(view: BuildOptionsView, rows: readonly BuildOptionRow[]): void {
  for (const row of rows) {
    const missingText = view.missing.get(row.type);
    if (missingText !== undefined) {
      missingText.textContent = row.missingText ?? "";
    }
  }
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

function updateSummaryView(view: SummaryView, rows: readonly SummaryRow[]): void {
  rows.forEach((row, index) => {
    const value = view.values[index];
    if (value !== undefined) {
      value.textContent = row.value;
    }
  });
}

/**
 * Adds rows for new ids and removes rows for gone ids; every other row is
 * updated in place and never moved, so a focused or open select survives.
 */
function updateResidentListView(view: ResidentListView, rows: readonly ResidentRow[]): void {
  const present = new Set<number>();
  let previous: HTMLElement | null = null;
  for (const row of rows) {
    present.add(row.id);
    let rowView = view.rows.get(row.id);
    if (rowView === undefined) {
      rowView = buildResidentRow(row, view.onPin);
      view.rows.set(row.id, rowView);
      if (previous === null) {
        view.list.prepend(rowView.item);
      } else {
        previous.after(rowView.item);
      }
    }
    updateResidentRow(rowView, row);
    previous = rowView.item;
  }
  for (const [id, rowView] of view.rows) {
    if (!present.has(id)) {
      rowView.item.remove();
      view.rows.delete(id);
    }
  }
}

function updateResidentRow(view: ResidentRowView, row: ResidentRow): void {
  view.name.textContent = row.name;
  view.age.textContent = row.ageText;
  view.job.textContent = row.jobText;
  view.waitingNote.textContent = row.waitingNote ?? "";
  for (const needRow of row.needs) {
    const need = view.needs.get(needRow.need);
    if (need === undefined) continue;
    need.label.textContent = needRow.label;
    need.meter.value = needRow.value;
    need.value.textContent = needRow.valueText;
  }
  view.pinLabel.textContent = row.pinLabel;
  view.pinSelect.disabled = !row.canPin;
  const wanted = row.pinnedJob ?? NO_PIN;
  // Only on a real difference: setting the value of an open select would reset it.
  if (view.pinSelect.value !== wanted) {
    view.pinSelect.value = wanted;
  }
}

function updateJobTargetView(view: JobTargetView, rows: readonly JobTargetRow[]): void {
  for (const row of rows) {
    const rowView = view.rows.get(row.job);
    if (rowView === undefined) continue;
    rowView.target.textContent = String(row.target);
    rowView.occupancy.textContent = row.occupancyText;
    rowView.decrease.disabled = !row.canDecrease;
  }
}
