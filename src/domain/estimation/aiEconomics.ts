import { round2 } from "./math";
import type { CostingModel, Explanation } from "./types";
import { calculateCommercialCost } from "./costing";
import { calculateRequiredSprints } from "./planning";

export function calculateAiEconomics(input: {
  model: CostingModel;
  plannedDev: number;
  plannedQa: number;
  devSp: number;
  qaSp: number;
  baseDevCapacity: number;
  baseQaCapacity: number;
  aiDevCapacity: number;
  aiQaCapacity: number;
  resourceSprintRate: number;
  teamSprintRate: number;
  otherFixedCost: number;
  planningMode: "RESOURCE_CONSTRAINED" | "SPRINT_CONSTRAINED";
  targetSprints: number;
}): {
  baselineResourceSprints: number;
  aiAdjustedResourceSprints: number;
  baselineDeliveryCost: number;
  aiAdjustedDeliveryCost: number;
  estimatedAiCostAvoidance: number;
  aiCostSavingPct: number;
  explanation: Explanation;
} {
  const baselineDuration = calculateRequiredSprints({
    devSP: input.devSp,
    qaSP: input.qaSp,
    devResources: input.plannedDev,
    qaResources: input.plannedQa,
    devCapacity: input.baseDevCapacity,
    qaCapacity: input.baseQaCapacity,
  });
  const aiDuration = calculateRequiredSprints({
    devSP: input.devSp,
    qaSP: input.qaSp,
    devResources: input.plannedDev,
    qaResources: input.plannedQa,
    devCapacity: input.aiDevCapacity,
    qaCapacity: input.aiQaCapacity,
  });

  const baselineSprints =
    input.planningMode === "SPRINT_CONSTRAINED"
      ? input.targetSprints
      : baselineDuration.finalSprints;
  const aiSprints =
    input.planningMode === "SPRINT_CONSTRAINED"
      ? input.targetSprints
      : aiDuration.finalSprints;

  const baseline = calculateCommercialCost({
    model: input.model,
    plannedDev: input.plannedDev,
    plannedQa: input.plannedQa,
    sprints: baselineSprints,
    resourceSprintRate: input.resourceSprintRate,
    teamSprintRate: input.teamSprintRate,
    otherFixedCost: input.otherFixedCost,
  });
  const adjusted = calculateCommercialCost({
    model: input.model,
    plannedDev: input.plannedDev,
    plannedQa: input.plannedQa,
    sprints: aiSprints,
    resourceSprintRate: input.resourceSprintRate,
    teamSprintRate: input.teamSprintRate,
    otherFixedCost: input.otherFixedCost,
  });

  const estimatedAiCostAvoidance = round2(
    baseline.deliveryCost - adjusted.deliveryCost,
  );
  const aiCostSavingPct =
    baseline.deliveryCost === 0
      ? 0
      : round2((estimatedAiCostAvoidance / baseline.deliveryCost) * 100);

  return {
    baselineResourceSprints: baseline.resourceSprints,
    aiAdjustedResourceSprints: adjusted.resourceSprints,
    baselineDeliveryCost: baseline.deliveryCost,
    aiAdjustedDeliveryCost: adjusted.deliveryCost,
    estimatedAiCostAvoidance,
    aiCostSavingPct,
    explanation: {
      title: "AI-Adjusted Economics",
      summary: `Avoidance ${estimatedAiCostAvoidance} (${aiCostSavingPct}%)`,
      steps: [
        "AI savings are applied once: via capacity → duration/resource-sprints → commercial cost.",
        "AI is not also subtracted from baseline SP.",
        `Baseline sprints (no AI capacity) = ${baselineSprints}; cost = ${baseline.deliveryCost}`,
        `AI-adjusted sprints = ${aiSprints}; cost = ${adjusted.deliveryCost}`,
        `Estimated AI Cost Avoidance = ${baseline.deliveryCost} − ${adjusted.deliveryCost} = ${estimatedAiCostAvoidance}`,
      ],
    },
  };
}
