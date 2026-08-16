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
  actualEstimatedEffortRatio: number;
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
  const grouped = new Map<string, number[]>();
  for (const sample of input.samples) {
    const list = grouped.get(sample.resourceLevelId) ?? [];
    list.push(sample.actualEstimatedEffortRatio);
    grouped.set(sample.resourceLevelId, list);
  }

  const rows: CalibrationRow[] = input.levels.map((level) => {
    const ratios = grouped.get(level.id) ?? [];
    const samples = ratios.length;
    const avgActualEstRatio =
      samples === 0 ? null : round2(ratios.reduce((sum, n) => sum + n, 0) / samples);
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

  const allRatios = input.samples.map((s) => s.actualEstimatedEffortRatio);
  const overallAvgRatio =
    allRatios.length === 0
      ? null
      : round2(allRatios.reduce((sum, n) => sum + n, 0) / allRatios.length);

  return {
    rows,
    overallAvgRatio,
    explanation: {
      title: "Suggested Days/Point",
      summary: overallAvgRatio == null ? "No actuals yet" : `Overall avg ratio ${overallAvgRatio}`,
      steps: [
        "Derived from the Register Actual/Est ratios by Dev resource level (CRs with actuals).",
        "Suggested Days/Point = Current Days/Point × Avg Actual/Est Ratio.",
        "Automatic parameter changes require governance approval; suggestions are not applied silently.",
      ],
    },
  };
}
