import { round2 } from "./math";
import type { EstimationConfig, Explanation, TShirt } from "./types";
import { getResourceLevel } from "./capacity";

export function calculateEffort(input: {
  totalSp: number;
  devSp: number;
  qaSp: number;
  tshirt: TShirt;
  devLevelId: string;
  qaLevelId: string;
  devAiPct: number;
  qaAiPct: number;
  config: EstimationConfig;
}): {
  referenceEffortPd: number;
  adjustedDevEffortPd: number;
  adjustedQaEffortPd: number;
  adjustedTotalEffortPd: number;
  explanation: Explanation;
} {
  const multiplier = input.config.complexityMultipliers[input.tshirt];
  const senior = getResourceLevel("senior", input.config);
  const dev = getResourceLevel(input.devLevelId, input.config);
  const qa = getResourceLevel(input.qaLevelId, input.config);

  const referenceEffortPd = round2(input.totalSp * senior.daysPerPoint);
  const adjustedDevEffortPd = round2(
    (input.devSp * dev.daysPerPoint * multiplier) / (1 + input.devAiPct),
  );
  const adjustedQaEffortPd = round2(
    (input.qaSp * qa.daysPerPoint * multiplier) / (1 + input.qaAiPct),
  );
  const adjustedTotalEffortPd = round2(adjustedDevEffortPd + adjustedQaEffortPd);

  return {
    referenceEffortPd,
    adjustedDevEffortPd,
    adjustedQaEffortPd,
    adjustedTotalEffortPd,
    explanation: {
      title: "Resource-Aware Engineering Effort",
      summary: `${adjustedTotalEffortPd} person-days (distinct from SP-equivalent reference effort of ${referenceEffortPd} PD)`,
      steps: [
        `SP-Equivalent Reference Effort = ${input.totalSp} SP × Senior ${senior.daysPerPoint} days/point = ${referenceEffortPd} PD`,
        `These two models are not required to be numerically identical.`,
        `Adjusted Dev Effort = ${input.devSp} × ${dev.daysPerPoint} × ${multiplier} / (1 + ${input.devAiPct}) = ${adjustedDevEffortPd}`,
        `Adjusted QA Effort = ${input.qaSp} × ${qa.daysPerPoint} × ${multiplier} / (1 + ${input.qaAiPct}) = ${adjustedQaEffortPd}`,
        `Adjusted Total Effort = ${adjustedDevEffortPd} + ${adjustedQaEffortPd} = ${adjustedTotalEffortPd}`,
      ],
    },
  };
}
