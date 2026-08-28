import { round2, round4 } from "./math";
import type { Explanation, ResourceLevelConfig } from "./types";

export function calculateVariance(input: {
  actualDevPd: number;
  actualQaPd: number;
  actualSprints: number;
  actualCost: number;
  estimatedDevPd: number;
  estimatedQaPd: number;
  estimatedSprints: number;
  estimatedCost: number;
}): {
  devEffortVariance: number | null;
  qaEffortVariance: number | null;
  durationVariance: number | null;
  costVariance: number | null;
  actualEstimatedEffortRatio: number | null;
  interpretation: string;
  explanation: Explanation;
} {
  for (const [name, value] of Object.entries(input)) {
    if (value < 0) throw new Error(`${name} cannot be negative`);
  }

  const ratioDenom = input.estimatedDevPd + input.estimatedQaPd;
  const actualTotal = input.actualDevPd + input.actualQaPd;
  const actualEstimatedEffortRatio =
    ratioDenom === 0 ? null : round4(actualTotal / ratioDenom);

  let interpretation = "Insufficient estimated effort to interpret accuracy.";
  if (actualEstimatedEffortRatio !== null) {
    if (actualEstimatedEffortRatio === 1) interpretation = "Accurate (ratio = 1).";
    else if (actualEstimatedEffortRatio > 1) interpretation = "Underestimated (ratio > 1).";
    else interpretation = "Overestimated (ratio < 1).";
  }

  const pct = (actual: number, estimated: number) =>
    estimated === 0 ? null : round4((actual - estimated) / estimated);

  return {
    devEffortVariance: pct(input.actualDevPd, input.estimatedDevPd),
    qaEffortVariance: pct(input.actualQaPd, input.estimatedQaPd),
    durationVariance: pct(input.actualSprints, input.estimatedSprints),
    costVariance: pct(input.actualCost, input.estimatedCost),
    actualEstimatedEffortRatio,
    interpretation,
    explanation: {
      title: "Estimate Variance",
      summary: interpretation,
      steps: [
        `Dev Effort Variance = (Actual Dev PD − Estimated Dev PD) / Estimated Dev PD`,
        `QA, duration and cost variances use the same form.`,
        `Actual / Estimated Effort Ratio = ${actualTotal} / ${ratioDenom} = ${actualEstimatedEffortRatio}`,
      ],
    },
  };
}

export type CalibrationSample = {
  resourceLevelId: string;
  /** Raw effort in person-days for one CR — kept unratioed so aggregation is effort-weighted. */
  actualEffortPd: number;
  estimatedEffortPd: number;
};

export type CalibrationRow = {
  id: string;
  name: string;
  currentDaysPerPoint: number;
  avgActualEstRatio: number | null;
  suggestedDaysPerPoint: number | null;
  samples: number;
};

export function calibrateDaysPerPoint(input: {
  levels: Pick<ResourceLevelConfig, "id" | "name" | "daysPerPoint">[];
  samples: CalibrationSample[];
}): { rows: CalibrationRow[]; overallAvgRatio: number | null; explanation: Explanation } {
  // DEC-007 A1: effort-weighted ratio-of-sums per resource level.
  //   ratio(L) = Σ actual effort ÷ Σ estimated effort   (NOT the unweighted mean of per-CR ratios)
  // so a large CR counts in proportion to its size. `avgActualEstRatio` / `overallAvgRatio` retain
  // their names for API/UI stability but now hold this effort-weighted ratio.
  const grouped = new Map<string, { actual: number; estimated: number; n: number }>();
  for (const sample of input.samples) {
    const g = grouped.get(sample.resourceLevelId) ?? { actual: 0, estimated: 0, n: 0 };
    g.actual += sample.actualEffortPd;
    g.estimated += sample.estimatedEffortPd;
    g.n += 1;
    grouped.set(sample.resourceLevelId, g);
  }

  const rows: CalibrationRow[] = input.levels.map((level) => {
    const g = grouped.get(level.id);
    const samples = g?.n ?? 0;
    const avgActualEstRatio = g && g.estimated > 0 ? round2(g.actual / g.estimated) : null;
    const suggestedDaysPerPoint =
      avgActualEstRatio == null ? null : round2(level.daysPerPoint * avgActualEstRatio);
    return {
      id: level.id,
      name: level.name,
      currentDaysPerPoint: level.daysPerPoint,
      avgActualEstRatio,
      suggestedDaysPerPoint,
      samples,
    };
  });

  let totalActual = 0;
  let totalEstimated = 0;
  for (const sample of input.samples) {
    totalActual += sample.actualEffortPd;
    totalEstimated += sample.estimatedEffortPd;
  }
  const overallAvgRatio =
    input.samples.length === 0 || totalEstimated === 0 ? null : round2(totalActual / totalEstimated);

  return {
    rows,
    overallAvgRatio,
    explanation: {
      title: "Suggested Days/Point",
      summary:
        overallAvgRatio == null ? "No actuals yet" : `Overall effort-weighted ratio ${overallAvgRatio}`,
      steps: [
        "Effort-weighted from Register actuals by Dev resource level (CRs with actuals): ratio = Σ actual effort ÷ Σ estimated effort.",
        "Suggested Days/Point = Current Days/Point × effort-weighted Actual/Est ratio.",
        "Automatic parameter changes require governance approval; suggestions are not applied silently.",
      ],
    },
  };
}

// ── DEC-007 A2: shrinkage toward the parent + minimum-sample floor ───────────────
// Pure domain logic. The caller supplies a cell's own (ratio, n) and its ancestor
// chain (nearest → farthest), each already aggregated with the A1 effort-weighted
// ratio-of-sums. Building those aggregates and ordering the ancestors via the org
// tree (crew → stream → sub-division → division → company) is the caller's job and
// is wired in A5. This module only decides the ratio to use.

/** Shrinkage pseudo-count: strength of the parent prior. */
export const CALIBRATION_K = 8;
/** Minimum eligible samples to calibrate a cell; below this it inherits the parent. */
export const CALIBRATION_N_MIN = 8;
/** Terminal fallback when no ancestor qualifies: ratio 1.0 = "no change to Days/Point". */
export const GLOBAL_BASELINE_RATIO = 1;

export type CalibrationCell = {
  /** Effort-weighted ratio-of-sums for this (unit, level); null when it has no samples. */
  ratio: number | null;
  /** Eligible sample count for this cell. */
  n: number;
};

/**
 * The parent ratio to shrink toward: the nearest ancestor (ordered nearest → farthest)
 * whose own sample count meets `nMin`. If none up to COMPANY qualifies, the global
 * baseline (1.0).
 */
export function resolveParentRatio(
  ancestors: CalibrationCell[],
  nMin: number = CALIBRATION_N_MIN,
): number {
  for (const ancestor of ancestors) {
    if (ancestor.n >= nMin && ancestor.ratio != null) return ancestor.ratio;
  }
  return GLOBAL_BASELINE_RATIO;
}

/**
 * Resolve the ratio actually used for a cell (DEC-007 A2):
 *  - `n < nMin` (or no own ratio) → inherit the parent unchanged;
 *  - otherwise → shrink toward the parent: (n·ratio + k·parent) / (n + k).
 * `parentRatio` comes from {@link resolveParentRatio}. Result is round2'd.
 */
export function calibrateWithShrinkage(
  cell: CalibrationCell,
  ancestors: CalibrationCell[],
  opts: { k?: number; nMin?: number } = {},
): { ratioUsed: number; parentRatio: number; inherited: boolean } {
  const k = opts.k ?? CALIBRATION_K;
  const nMin = opts.nMin ?? CALIBRATION_N_MIN;
  const parentRatio = resolveParentRatio(ancestors, nMin);

  if (cell.ratio == null || cell.n < nMin) {
    return { ratioUsed: round2(parentRatio), parentRatio, inherited: true };
  }
  const shrunk = (cell.n * cell.ratio + k * parentRatio) / (cell.n + k);
  return { ratioUsed: round2(shrunk), parentRatio, inherited: false };
}
