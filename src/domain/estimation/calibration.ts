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
  /** Systematic bias — the effort-weighted Actual/Est ratio. */
  avgActualEstRatio: number | null;
  suggestedDaysPerPoint: number | null;
  /** Sample sufficiency. */
  samples: number;
  /** DEC-007 A6: dispersion — coefficient of variation of the per-CR clamped ratios (null if <2). */
  dispersionCv: number | null;
  /** DEC-007 A6: true when CV > cv_flag — a single multiplier can't fix scatter (low-confidence). */
  lowConfidence: boolean;
};

/** DEC-007 A6: dispersion threshold — above this a cell is flagged inconsistent / low-confidence. */
export const CALIBRATION_CV_FLAG = 0.5;

// ── DEC-007 A3: eligibility (size floor) + per-CR outlier damping ────────────────
/** Minimum estimated effort (PD) for a CR to be eligible; also guards divide-by-zero. */
export const CALIBRATION_MIN_SIZE_PD = 2;
/** Per-CR ratio clamp bounds — a single mis-scoped CR contributes at most cap× its estimate. */
export const CALIBRATION_RATIO_FLOOR = 0.33;
export const CALIBRATION_RATIO_CAP = 3.0;

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

/**
 * DEC-007 A6: coefficient of variation (population stddev ÷ mean) of a set of per-CR ratios.
 * Returns null for fewer than 2 samples or a non-positive mean. A high CV means the cell is
 * inconsistent — bias correction alone can't fix scatter.
 */
export function coefficientOfVariation(values: number[]): number | null {
  if (values.length < 2) return null;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  if (mean <= 0) return null;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  return round2(Math.sqrt(variance) / mean);
}

// ── DEC-007 A4: trailing recency window ──────────────────────────────────────────
/** Trailing calibration window in months. Recency basis = ActualDelivery.finalisedAt. */
export const CALIBRATION_WINDOW_MONTHS = 12;

/**
 * A CR is within the trailing window iff its actuals were finalised on/after (now − W months).
 * `null` finalisedAt → not eligible (never inferred from other timestamps). Boundary is
 * inclusive. No decay; no auto-expansion — insufficient in-window history is handled upstream
 * by A2 inheritance, not by widening the window.
 */
export function isWithinCalibrationWindow(
  finalisedAt: Date | null | undefined,
  now: Date,
  windowMonths: number = CALIBRATION_WINDOW_MONTHS,
): boolean {
  if (!finalisedAt) return false;
  // UTC calendar-month arithmetic via Date.UTC — the governed cutoff must NOT depend on the local
  // server timezone or DST. Date.UTC normalises an out-of-range (negative) month across years.
  const cutoff = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth() - windowMonths,
    now.getUTCDate(),
    now.getUTCHours(),
    now.getUTCMinutes(),
    now.getUTCSeconds(),
    now.getUTCMilliseconds(),
  );
  return finalisedAt.getTime() >= cutoff;
}

export function calibrateDaysPerPoint(input: {
  levels: Pick<ResourceLevelConfig, "id" | "name" | "daysPerPoint">[];
  samples: CalibrationSample[];
}): { rows: CalibrationRow[]; overallAvgRatio: number | null; explanation: Explanation } {
  // DEC-007 A1 + A3: effort-weighted ratio-of-sums per resource level, with a size-floor
  // eligibility filter and per-CR outlier clamping that PRESERVES the effort-weighting:
  //   raw_ratio_i     = actual_i / estimated_i
  //   clamped_ratio_i = clamp(raw_ratio_i, FLOOR, CAP)
  //   adjusted_actual = estimated_i × clamped_ratio_i
  //   ratio(L)        = Σ adjusted_actual ÷ Σ estimated_i
  // With no outliers clamped_ratio == raw_ratio, so this reduces to A1's ratio-of-sums.
  // `avgActualEstRatio` / `overallAvgRatio` retain their names for API/UI stability.
  const grouped = new Map<string, { actual: number; estimated: number; n: number; ratios: number[] }>();
  let totalActual = 0;
  let totalEstimated = 0;
  for (const sample of input.samples) {
    // A3 eligibility: exclude sub-minimum CRs (also excludes estimated ≤ 0).
    if (sample.estimatedEffortPd < CALIBRATION_MIN_SIZE_PD) continue;
    // A3 damping: clamp the per-CR ratio, then rebuild an adjusted actual so summation stays effort-weighted.
    const rawRatio = sample.actualEffortPd / sample.estimatedEffortPd;
    const clampedRatio = clamp(rawRatio, CALIBRATION_RATIO_FLOOR, CALIBRATION_RATIO_CAP);
    const adjustedActual = sample.estimatedEffortPd * clampedRatio;

    const g = grouped.get(sample.resourceLevelId) ?? { actual: 0, estimated: 0, n: 0, ratios: [] };
    g.actual += adjustedActual;
    g.estimated += sample.estimatedEffortPd;
    g.n += 1;
    g.ratios.push(clampedRatio); // A6: per-CR ratios for the dispersion measure
    grouped.set(sample.resourceLevelId, g);
    totalActual += adjustedActual;
    totalEstimated += sample.estimatedEffortPd;
  }

  const rows: CalibrationRow[] = input.levels.map((level) => {
    const g = grouped.get(level.id);
    const samples = g?.n ?? 0;
    const avgActualEstRatio = g && g.estimated > 0 ? round2(g.actual / g.estimated) : null;
    const suggestedDaysPerPoint =
      avgActualEstRatio == null ? null : round2(level.daysPerPoint * avgActualEstRatio);
    // A6: dispersion (coefficient of variation) of the per-CR ratios — separate from bias.
    const dispersionCv = g ? coefficientOfVariation(g.ratios) : null;
    return {
      id: level.id,
      name: level.name,
      currentDaysPerPoint: level.daysPerPoint,
      avgActualEstRatio,
      suggestedDaysPerPoint,
      samples,
      dispersionCv,
      lowConfidence: dispersionCv != null && dispersionCv > CALIBRATION_CV_FLAG,
    };
  });

  const overallAvgRatio = totalEstimated === 0 ? null : round2(totalActual / totalEstimated);

  return {
    rows,
    overallAvgRatio,
    explanation: {
      title: "Suggested Days/Point",
      summary:
        overallAvgRatio == null ? "No actuals yet" : `Overall effort-weighted ratio ${overallAvgRatio}`,
      steps: [
        "Effort-weighted from Register actuals by Dev resource level (eligible CRs): ratio = Σ adjusted actual ÷ Σ estimated effort.",
        `Per-CR ratios clamped to [${CALIBRATION_RATIO_FLOOR}, ${CALIBRATION_RATIO_CAP}]; CRs under ${CALIBRATION_MIN_SIZE_PD} PD excluded.`,
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
