// Turns the game state into the rows of the Produktionskette area.
// Pure and DOM-free so the order, counts and missing marks can be unit-tested.

import type { Good } from "../sim/goods";
import type { Job } from "../sim/jobs";
import { CONSUMED_GOODS } from "../sim/needs";
import { countWorkersByJob } from "../sim/production";
import { getProductionChain } from "../sim/productionChain";
import { findShortages, missingBuildingsFor } from "../sim/shortages";
import type { GameState } from "../sim/state";
import { de } from "../text/de";

export interface ChainGoodCell {
  good: Good;
  name: string;
  /** Stock rounded down, like the Lager panel. */
  amount: string;
  missing: boolean;
  bottleneck: boolean;
}

export interface ChainRow {
  /** The job of this step, or null for the residents' step. */
  job: Job | null;
  /** Job name, or "Bewohner". */
  name: string;
  /** "2 bei der Arbeit" for a job, "essen und trinken" for the residents. */
  detail: string;
  inputs: ChainGoodCell[];
  outputs: ChainGoodCell[];
}

export interface ProductionChainView {
  bottleneckText: string;
  /** True when bottleneckText names at least one good. */
  hasBottleneck: boolean;
  /** One row per job step in chain order, then the residents' row. */
  rows: ChainRow[];
}

export function formatProductionChain(state: GameState): ProductionChainView {
  const { missing, bottlenecks } = findShortages(state);
  const workers = countWorkersByJob(state.buildings, state.residents);

  const cell = (good: Good): ChainGoodCell => ({
    good,
    name: de.goods[good],
    // Rounded down so a fractional stock such as 0.5 never looks like 1 available unit.
    amount: String(Math.floor(state.storage[good])),
    missing: missing.includes(good),
    bottleneck: bottlenecks.includes(good),
  });

  const rows: ChainRow[] = getProductionChain().map((step) => ({
    job: step.job,
    name: de.jobs[step.job],
    detail: `${workers[step.job]} ${de.productionChain.working}`,
    inputs: step.inputs.map(cell),
    outputs: step.outputs.map(cell),
  }));
  rows.push({
    job: null,
    name: de.productionChain.residents,
    detail: de.productionChain.residentsAction,
    inputs: CONSUMED_GOODS.map(cell),
    outputs: [],
  });

  // A bottleneck good whose building does not exist at all names it in parentheses,
  // so the player sees what to build: "Engpass: Brot (keine Bäckerei)".
  const bottleneckName = (good: Good): string => {
    const causes = missingBuildingsFor(state, good).map((type) => de.productionChain.missingBuilding[type]);
    return causes.length === 0 ? de.goods[good] : `${de.goods[good]} (${causes.join(", ")})`;
  };
  const bottleneckText =
    bottlenecks.length === 0
      ? de.productionChain.noBottleneck
      : `${de.productionChain.bottleneckPrefix}: ${bottlenecks.map(bottleneckName).join(", ")}`;

  return { bottleneckText, hasBottleneck: bottlenecks.length > 0, rows };
}
