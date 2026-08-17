import { round2, round3 } from "./math";
import type { EstimationConfig, Explanation, TShirt } from "./types";
import { getResourceLevel } from "./capacity";

export function calculateEffort(input: {
  totalSp: number;
  devSp: number;
  qaSp: number;
  assessedTshirt: TShirt;
  refDevPd: number;
  refQaPd: number;
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
  rawTotalEffortPd: number;
  complexityMultiplier: number;
  explanation: Explanation;
} {
  const multiplier = input.config.complexityMultipliers[input.assessedTshirt];
  const dev = getResourceLevel(input.devLevelId, input.config);
  const qa = getResourceLevel(input.qaLevelId, input.config);
  const rawDev = (input.devSp * dev.daysPerPoint * multiplier) / (1 + input.devAiPct);
  const rawQa = (input.qaSp * qa.daysPerPoint * multiplier) / (1 + input.qaAiPct);
  const rawTotalEffortPd = rawDev + rawQa;
  const adjustedDevEffortPd = round3(rawDev);
  const adjustedQaEffortPd = round3(rawQa);
  const adjustedTotalEffortPd = round3(rawTotalEffortPd);
  const referenceEffortPd = round2(input.refDevPd + input.refQaPd);

  return {
    referenceEffortPd,
    adjustedDevEffortPd,
    adjustedQaEffortPd,
    adjustedTotalEffortPd,
    rawTotalEffortPd,
    complexityMultiplier: multiplier,
    explanation: {
      title: "Resource-Aware Engineering Effort",
      summary: `${adjustedTotalEffortPd} person-days`,
      steps: [
        `Complexity multiplier (assessed T-shirt) = ${multiplier}`,
        `Adjusted Dev Effort = ${input.devSp} × ${dev.daysPerPoint} × ${multiplier} / (1 + ${input.devAiPct}) = ${adjustedDevEffortPd}`,
        `Adjusted QA Effort = ${input.qaSp} × ${qa.daysPerPoint} × ${multiplier} / (1 + ${input.qaAiPct}) = ${adjustedQaEffortPd}`,
        `The multiplier also drove T-shirt/size; applying it again to effort is intentional (R3).`,
      ],
    },
  };
}
