import { calculateAiEconomics } from "./aiEconomics";
import { aiAdjustedCapacity, explainAiCapacity, getResourceLevel } from "./capacity";
import { calculateConfidence } from "./confidence";
import { calculateComplexityIndex, mapIndexToTshirt } from "./complexity";
import { blendedDailyRate, blendedDailyRateFromRoster, resolveSprintRates } from "./costing";
import { splitDevQa } from "./devQaSplit";
import { calculateEffort } from "./effort";
import { decideGovernance } from "./governance";
import { round2 } from "./math";
import { planDelivery } from "./planning";
import { calculateReadiness } from "./readiness";
import { lookupMapping, mapStoryPoints } from "./storyPoints";
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
  const isEpic = input.workItemType === "EPIC";

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

  const split = splitDevQa(selectedSp, effectiveTshirt, input.workItemType, config);
  explanations.devQa = split.explanation;
  const lookup = lookupMapping(input.workItemType, effectiveTshirt, config);

  const optTshirt = applyStance(assessedTshirt, "OPTIMISTIC");
  const pesTshirt = applyStance(assessedTshirt, "PESSIMISTIC");
  const optimisticSp = mapStoryPoints(input.workItemType, optTshirt, config).sp;
  const pessimisticSp = mapStoryPoints(input.workItemType, pesTshirt, config).sp;

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
    assessedTshirt,
    refDevPd: split.refDevPd,
    refQaPd: split.refQaPd,
    devLevelId: input.devResourceLevelId,
    qaLevelId: input.qaResourceLevelId,
    devAiPct: input.devAiProductivityPct,
    qaAiPct: input.qaAiProductivityPct,
    config,
  });
  explanations.effort = effort.explanation;

  const roster = input.roster ?? [];
  const blended =
    roster.length > 0
      ? blendedDailyRateFromRoster(roster, config.locationDailyRates)
      : blendedDailyRate(input.locationAllocations);
  explanations.blendedRate = blended.explanation;
  const effortBasedNumeric = round2(effort.rawTotalEffortPd * blended.rate);
  explanations.effortCost = {
    title: "Effort-Based Analytical Cost",
    summary: isEpic ? "Deferred" : `${effortBasedNumeric}`,
    steps: [
      "This analytical engineering-cost view is not required to reconcile to sprint-based commercial billing.",
      `Effort-Based Delivery Cost = ${effort.rawTotalEffortPd} PD × blended daily rate ${blended.rate} = ${effortBasedNumeric}`,
    ],
  };

  const rates = resolveSprintRates({
    costingBasis: input.costingBasis,
    teamName: input.teamName,
    locationName: input.locationName,
    resourceSprintRate: input.resourceSprintRate,
    teamSprintRate: input.teamSprintRate,
    config,
  });
  const selectedRate =
    input.projectOverrideRate != null && input.projectOverrideRate > 0
      ? input.projectOverrideRate
      : input.resourceSprintRate || rates.resourceSprintRate;

  const plannedResources = plan.plannedDev + plan.plannedQa;
  const standardTeamSize = input.standardTeamSize || config.standardTeamSize || 10;
  const utilisation = standardTeamSize === 0 ? 0 : round2((plannedResources / standardTeamSize) * 100);

  const economics = calculateAiEconomics({
    isEpic,
    plannedDev: plan.plannedDev,
    plannedQa: plan.plannedQa,
    devSp: split.devSp,
    qaSp: split.qaSp,
    baseDevCapacity: devLevel.capacitySpPerSprint,
    baseQaCapacity: qaLevel.capacitySpPerSprint,
    finalSprints: plan.finalSprints,
    selectedRate,
    refDevPd: split.refDevPd,
    refQaPd: split.refQaPd,
    devAiPct: input.devAiProductivityPct,
    qaAiPct: input.qaAiProductivityPct,
    otherFixedCost: input.otherFixedCost,
  });
  explanations.cost = economics.explanation;

  const readiness = calculateReadiness(input.readiness);
  explanations.readiness = readiness.explanation;
  const confidence = calculateConfidence({
    dorStatus: readiness.status,
    scores: input.complexityScores,
    config,
  });
  explanations.confidence = confidence.explanation;
  const governance = decideGovernance({
    workItemType: input.workItemType,
    assessedTshirt,
    selectedSp,
    finalSprints: plan.finalSprints,
    complexityIndex: complexity.index,
    scores: input.complexityScores,
    dorStatus: readiness.status,
    overrideEnabled: input.overrideEnabled,
    overrideReason: input.overrideReason,
    overrideApprovedBy: input.overrideApprovedBy,
    projectOverrideRate: input.projectOverrideRate,
    costingBasis: input.costingBasis,
    teamName: input.teamName,
    locationName: input.locationName,
    costMethod: input.costMethod ?? (isEpic ? undefined : "Resource Cost per Sprint"),
    config,
  });
  explanations.governance = governance.explanation;

  const epicStories = isEpic ? lookup.expectedStories : null;
  const epicSpPerStory =
    isEpic && lookup.expectedStories
      ? Math.round(lookup.totalSp / lookup.expectedStories)
      : null;
  const epicSummary =
    isEpic && lookup.expectedStories
      ? `Split into ${lookup.expectedStories} stories of ~${epicSpPerStory} SP each`
      : null;

  const costOrNull = <T,>(value: T): T | null => (isEpic ? null : value);

  return {
    complexityIndex: complexity.index,
    complexityIndexPct: complexity.indexPct,
    assessedTshirt,
    effectiveTshirt,
    baselineSp,
    selectedSp,
    optimisticSp,
    pessimisticSp,
    governedTotalSp: selectedSp,
    qaShare: split.qaShare,
    devSp: split.devSp,
    qaSp: split.qaSp,
    refDevPd: split.refDevPd,
    refQaPd: split.refQaPd,
    refTotalPd: round2(split.refDevPd + split.refQaPd),
    complexityMultiplier: effort.complexityMultiplier,
    devCapacity: devLevel.capacitySpPerSprint,
    qaCapacity: qaLevel.capacitySpPerSprint,
    aiAdjustedDevCapacity: aiDevCapacity,
    aiAdjustedQaCapacity: aiQaCapacity,
    requiredDev: plan.requiredDev,
    requiredQa: plan.requiredQa,
    plannedDev: plan.plannedDev,
    plannedQa: plan.plannedQa,
    plannedResources,
    utilisation,
    applicability: utilisation < 100 ? "Partial team" : "Full team",
    selectedRate,
    devSprints: plan.devSprints,
    qaSprints: plan.qaSprints,
    calculatedSprints: plan.calculatedSprints,
    finalSprints: plan.finalSprints,
    referenceEffortPd: effort.referenceEffortPd,
    adjustedDevEffortPd: effort.adjustedDevEffortPd,
    adjustedQaEffortPd: effort.adjustedQaEffortPd,
    adjustedTotalEffortPd: effort.adjustedTotalEffortPd,
    blendedDailyRate: blended.rate,
    effortBasedCost: costOrNull(effortBasedNumeric),
    baselineResourceSprints: economics.baselineResourceSprints,
    aiAdjustedResourceSprints: economics.aiAdjustedResourceSprints,
    baselineDeliveryCost: economics.baselineDeliveryCost,
    aiAdjustedDeliveryCost: economics.aiAdjustedDeliveryCost,
    estimatedAiCostAvoidance: economics.estimatedAiCostAvoidance,
    aiAdjustedTotalCost: economics.aiAdjustedTotalCost,
    aiCostSavingPct: economics.aiCostSavingPct,
    costApplicability: economics.costApplicability,
    confidence: confidence.confidence,
    readinessScore: readiness.score,
    dorStatus: readiness.status,
    deliveryFlag: governance.deliveryFlag,
    governanceDecision: governance.decision,
    epicStories,
    epicSpPerStory,
    epicSummary,
    currency: input.currency,
    explanations,
  };
}
