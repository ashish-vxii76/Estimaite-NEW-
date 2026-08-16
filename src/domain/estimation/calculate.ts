import { calculateAiEconomics } from "./aiEconomics";
import { aiAdjustedCapacity, explainAiCapacity, getResourceLevel } from "./capacity";
import { calculateConfidence } from "./confidence";
import { calculateComplexityIndex, mapIndexToTshirt } from "./complexity";
import { blendedDailyRate } from "./costing";
import { splitDevQa } from "./devQaSplit";
import { calculateEffort } from "./effort";
import { decideGovernance } from "./governance";
import { planDelivery } from "./planning";
import { calculateReadiness } from "./readiness";
import { mapStoryPoints } from "./storyPoints";
import { applyStance } from "./tshirt";
import type {
  EstimateCalculationInput,
  EstimateCalculationResult,
  EstimationConfig,
  Explanation,
} from "./types";

export function calculateEstimate(
  input: EstimateCalculationInput,
  config: EstimationConfig,
): EstimateCalculationResult {
  const explanations: Record<string, Explanation> = {};

  const complexity = calculateComplexityIndex(input.complexityScores, config);
  explanations.complexity = complexity.explanation;
  const assessedTshirt = mapIndexToTshirt(complexity.index, config);
  const effectiveTshirt = applyStance(assessedTshirt, input.stance);
  explanations.tshirt = {
    title: "T-Shirt",
    summary: `Assessed ${assessedTshirt}; effective ${effectiveTshirt} (${input.stance})`,
    steps: [
      `Complexity index ${complexity.index} maps to ${assessedTshirt}`,
      `Stance ${input.stance}: Optimistic = one size lower, Pessimistic = one size higher, bounded XS–XXL`,
      `Effective T-shirt = ${effectiveTshirt}`,
    ],
  };

  const mapped = mapStoryPoints(input.workItemType, effectiveTshirt, config);
  explanations.storyPoints = mapped.explanation;
  const baselineSp = mapped.sp;
  const selectedSp =
    input.overrideEnabled && input.overrideSp != null ? input.overrideSp : baselineSp;
  if (input.overrideEnabled && input.overrideSp != null) {
    explanations.override = {
      title: "Manual Override",
      summary: `Governed selected SP ${selectedSp}; automated ${baselineSp} remains immutable`,
      steps: [
        `Automated SP ${baselineSp} is retained in history`,
        `Override SP ${selectedSp} drives downstream planning`,
      ],
    };
  }

  const split = splitDevQa(selectedSp, input.complexityScores, config);
  explanations.devQa = split.explanation;

  const devLevel = getResourceLevel(input.devResourceLevelId, config);
  const qaLevel = getResourceLevel(input.qaResourceLevelId, config);
  const aiDevCapacity = aiAdjustedCapacity(
    devLevel.capacitySpPerSprint,
    input.devAiProductivityPct,
    config,
  );
  const aiQaCapacity = aiAdjustedCapacity(
    qaLevel.capacitySpPerSprint,
    input.qaAiProductivityPct,
    config,
  );
  explanations.devCapacity = explainAiCapacity(
    "Dev",
    devLevel.capacitySpPerSprint,
    input.devAiProductivityPct,
    aiDevCapacity,
  );
  explanations.qaCapacity = explainAiCapacity(
    "QA",
    qaLevel.capacitySpPerSprint,
    input.qaAiProductivityPct,
    aiQaCapacity,
  );

  const plan = planDelivery({
    mode: input.planningMode,
    devSP: split.devSp,
    qaSP: split.qaSp,
    availableDev: input.availableDev,
    availableQa: input.availableQa,
    targetSprints: input.targetSprints,
    baseDevCapacity: devLevel.capacitySpPerSprint,
    baseQaCapacity: qaLevel.capacitySpPerSprint,
    aiDevCapacity,
    aiQaCapacity,
  });
  explanations.planning = plan.explanation;

  const effort = calculateEffort({
    totalSp: selectedSp,
    devSp: split.devSp,
    qaSp: split.qaSp,
    tshirt: effectiveTshirt,
    devLevelId: input.devResourceLevelId,
    qaLevelId: input.qaResourceLevelId,
    devAiPct: input.devAiProductivityPct,
    qaAiPct: input.qaAiProductivityPct,
    config,
  });
  explanations.effort = effort.explanation;

  const blended = blendedDailyRate(input.locationAllocations);
  explanations.blendedRate = blended.explanation;
  const effortBasedCost = Math.round(effort.adjustedTotalEffortPd * blended.rate * 100) / 100;
  explanations.effortCost = {
    title: "Effort-Based Analytical Cost",
    summary: `${effortBasedCost}`,
    steps: [
      "This analytical engineering-cost view is not required to reconcile to sprint-based commercial billing.",
      `Effort-Based Delivery Cost = ${effort.adjustedTotalEffortPd} PD × blended daily rate ${blended.rate} = ${effortBasedCost}`,
    ],
  };

  const economics = calculateAiEconomics({
    model: input.costingModel,
    plannedDev: plan.plannedDev,
    plannedQa: plan.plannedQa,
    devSp: split.devSp,
    qaSp: split.qaSp,
    baseDevCapacity: devLevel.capacitySpPerSprint,
    baseQaCapacity: qaLevel.capacitySpPerSprint,
    aiDevCapacity,
    aiQaCapacity,
    resourceSprintRate: input.resourceSprintRate,
    teamSprintRate: input.teamSprintRate,
    otherFixedCost: input.otherFixedCost,
    planningMode: input.planningMode,
    targetSprints: input.targetSprints,
  });
  explanations.cost = economics.explanation;

  const readiness = calculateReadiness(input.readiness);
  explanations.readiness = readiness.explanation;
  const confidence = calculateConfidence({
    readinessScore: readiness.score,
    scores: input.complexityScores,
    config,
  });
  explanations.confidence = confidence.explanation;
  const governance = decideGovernance({
    workItemType: input.workItemType,
    assessedTshirt,
    selectedSp,
    finalSprints: plan.finalSprints,
    readinessScore: readiness.score,
    config,
  });
  explanations.governance = governance.explanation;

  return {
    complexityIndex: complexity.index,
    complexityIndexPct: complexity.indexPct,
    assessedTshirt,
    effectiveTshirt,
    baselineSp,
    selectedSp,
    qaShare: split.qaShare,
    devSp: split.devSp,
    qaSp: split.qaSp,
    devCapacity: devLevel.capacitySpPerSprint,
    qaCapacity: qaLevel.capacitySpPerSprint,
    aiAdjustedDevCapacity: aiDevCapacity,
    aiAdjustedQaCapacity: aiQaCapacity,
    requiredDev: plan.requiredDev,
    requiredQa: plan.requiredQa,
    plannedDev: plan.plannedDev,
    plannedQa: plan.plannedQa,
    devSprints: plan.devSprints,
    qaSprints: plan.qaSprints,
    calculatedSprints: plan.calculatedSprints,
    finalSprints: plan.finalSprints,
    referenceEffortPd: effort.referenceEffortPd,
    adjustedDevEffortPd: effort.adjustedDevEffortPd,
    adjustedQaEffortPd: effort.adjustedQaEffortPd,
    adjustedTotalEffortPd: effort.adjustedTotalEffortPd,
    blendedDailyRate: blended.rate,
    effortBasedCost,
    baselineResourceSprints: economics.baselineResourceSprints,
    aiAdjustedResourceSprints: economics.aiAdjustedResourceSprints,
    baselineDeliveryCost: economics.baselineDeliveryCost,
    aiAdjustedDeliveryCost: economics.aiAdjustedDeliveryCost,
    estimatedAiCostAvoidance: economics.estimatedAiCostAvoidance,
    aiCostSavingPct: economics.aiCostSavingPct,
    confidence: confidence.confidence,
    readinessScore: readiness.score,
    governanceDecision: governance.decision,
    currency: input.currency,
    explanations,
  };
}
