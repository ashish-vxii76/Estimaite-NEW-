import { round2 } from "./math";
import type { Explanation } from "./types";
import { calculateRequiredSprints } from "./planning";

export function calculateAiEconomics(input: {
  isEpic: boolean;
  plannedDev: number;
  plannedQa: number;
  devSp: number;
  qaSp: number;
  baseDevCapacity: number;
  baseQaCapacity: number;
  finalSprints: number;
  selectedRate: number;
  refDevPd: number;
  refQaPd: number;
  devAiPct: number;
  qaAiPct: number;
  otherFixedCost: number;
}): {
  baselineResourceSprints: number | null;
  aiAdjustedResourceSprints: number | null;
  baselineDeliveryCost: number | null;
  aiAdjustedDeliveryCost: number | null;
  estimatedAiCostAvoidance: number | null;
  aiAdjustedTotalCost: number | null;
  aiCostSavingPct: number | null;
  costApplicability: string;
  explanation: Explanation;
} {
  if (input.isEpic) {
    return {
      baselineResourceSprints: null,
      aiAdjustedResourceSprints: null,
      baselineDeliveryCost: null,
      aiAdjustedDeliveryCost: null,
      estimatedAiCostAvoidance: null,
      aiAdjustedTotalCost: null,
      aiCostSavingPct: null,
      costApplicability: "COST DEFERRED — ROM Epic; cost at Story level",
      explanation: {
        title: "Epic cost deferral",
        summary: "Cost deferred to Story level",
        steps: ["R6: an Epic is sized and governed, but commercial cost is blank until decomposed."],
      },
    };
  }

  const plannedResources = input.plannedDev + input.plannedQa;
  const baselineDuration = calculateRequiredSprints({
    devSP: input.devSp,
    qaSP: input.qaSp,
    devResources: input.plannedDev,
    qaResources: input.plannedQa,
    devCapacity: input.baseDevCapacity,
    qaCapacity: input.baseQaCapacity,
  });
  const baselineResourceSprints = plannedResources * baselineDuration.finalSprints;
  const baselineDeliveryCost = baselineResourceSprints * input.selectedRate;
  const refTotal = input.refDevPd + input.refQaPd;
  const effortRatio =
    refTotal === 0
      ? 1
      : (input.refDevPd / (1 + input.devAiPct) + input.refQaPd / (1 + input.qaAiPct)) / refTotal;
  const wholeSprintRs = plannedResources * input.finalSprints;
  const continuousRs = baselineResourceSprints * effortRatio;
  const aiResourceSprints = Math.min(wholeSprintRs, continuousRs);
  const aiAdjustedDeliveryCost = aiResourceSprints * input.selectedRate;
  const estimatedAiCostAvoidance = baselineDeliveryCost - aiAdjustedDeliveryCost;
  const aiAdjustedTotalCost = aiAdjustedDeliveryCost + input.otherFixedCost;

  return {
    baselineResourceSprints: round2(baselineResourceSprints),
    aiAdjustedResourceSprints: round2(aiResourceSprints),
    baselineDeliveryCost: round2(baselineDeliveryCost),
    aiAdjustedDeliveryCost: round2(aiAdjustedDeliveryCost),
    estimatedAiCostAvoidance: round2(estimatedAiCostAvoidance),
    aiAdjustedTotalCost: round2(aiAdjustedTotalCost),
    aiCostSavingPct:
      baselineDeliveryCost === 0 ? 0 : round2((estimatedAiCostAvoidance / baselineDeliveryCost) * 100),
    costApplicability: "OK",
    explanation: {
      title: "AI-Adjusted Economics (MIN rule)",
      summary: `AI-adjusted ${round2(aiAdjustedDeliveryCost)}`,
      steps: [
        `Baseline sprints (no AI) = ${baselineDuration.finalSprints}; resource-sprints = ${plannedResources} × ${baselineDuration.finalSprints} = ${baselineResourceSprints}`,
        `Baseline cost = ${baselineResourceSprints} × ${input.selectedRate} = ${round2(baselineDeliveryCost)}`,
        `effort_ratio = (refDevPd/(1+DevAI) + refQaPd/(1+QaAI)) / (refDevPd+refQaPd) = ${effortRatio}`,
        `ai_resource_sprints = MIN(${wholeSprintRs}, ${continuousRs}) = ${aiResourceSprints}`,
        `AI-adjusted cost = ${aiResourceSprints} × ${input.selectedRate} = ${round2(aiAdjustedDeliveryCost)}`,
      ],
    },
  };
}
