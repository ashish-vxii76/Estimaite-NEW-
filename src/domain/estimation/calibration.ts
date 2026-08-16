import { round4 } from "./math";
import type { Explanation } from "./types";

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
