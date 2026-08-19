import type {
  ComplexityScoreInput,
  EstimationConfig,
  Explanation,
  GovernanceDecision,
  TShirt,
  WorkItemType,
  DorStatus,
} from "./types";

export function decideGovernance(input: {
  workItemType: WorkItemType;
  assessedTshirt: TShirt;
  selectedSp: number;
  finalSprints: number;
  complexityIndex: number;
  scores: ComplexityScoreInput[];
  dorStatus: DorStatus;
  overrideEnabled?: boolean;
  overrideReason?: string | null;
  overrideApprovedBy?: string | null;
  projectOverrideRate?: number | null;
  costingBasis?: string;
  teamName?: string;
  locationName?: string;
  costMethod?: string;
  config: EstimationConfig;
}): { deliveryFlag: GovernanceDecision; decision: GovernanceDecision; explanation: Explanation } {
  const steps: string[] = [];
  const uncertainty = input.scores.find((s) => s.dimensionId === "uncertainty")?.score ?? 3;
  const spike =
    uncertaintyTierIsSpike(uncertainty, input.config) ||
    input.config.complexityDimensions
      .find((d) => d.id === "uncertainty")
      ?.options?.[uncertainty - 1]?.toLowerCase()
      .includes("discovery");

  let deliveryFlag: GovernanceDecision;
  if (spike) {
    deliveryFlag = "SPIKE REQUIRED";
    steps.push("Uncertainty = Discovery / spike required → SPIKE REQUIRED (overrides other gates)");
  } else if (input.workItemType === "EPIC") {
    let sizeGate = 0;
    if (input.selectedSp >= input.config.epicSplitSp) sizeGate = 2;
    else if (input.selectedSp >= input.config.epicDecomposeSp) sizeGate = 1;
    const indexGate = indexLevel(input.complexityIndex, input.config);
    const structural = structuralGate(input.scores);
    const level = Math.max(sizeGate, indexGate, structural);
    deliveryFlag = (["PLAN", "DECOMPOSE", "SPLIT EPIC"] as const)[level];
    steps.push(`Epic gates size=${sizeGate} index=${indexGate} structural=${structural} → max ${level} → ${deliveryFlag}`);
  } else {
    let sizeGate = 0;
    if (input.selectedSp >= input.config.issueSplitSp) sizeGate = 2;
    if (input.finalSprints > input.config.issueMaxRecommendedSprints) sizeGate = Math.max(sizeGate, 2);
    else if (input.selectedSp >= input.config.issueReviewSp) sizeGate = Math.max(sizeGate, 1);
    const indexGate = indexLevel(input.complexityIndex, input.config);
    const structural = structuralGate(input.scores);
    const level = Math.max(sizeGate, indexGate, structural);
    deliveryFlag = (["READY", "REVIEW", "SPLIT"] as const)[level];
    steps.push(
      `Issue gates sprint/size=${sizeGate} index=${indexGate} structural=${structural} → max ${level} → ${deliveryFlag}`,
    );
  }

  let decision: GovernanceDecision = deliveryFlag;
  if (input.dorStatus === "Discovery Required") {
    decision = "DISCOVERY REQUIRED";
    steps.push("Final Planning Decision: DISCOVERY REQUIRED (DoR status)");
  } else if (spike) {
    decision = "SPIKE REQUIRED";
  } else if (input.overrideEnabled && (!input.overrideReason || !input.overrideApprovedBy)) {
    decision = "OVERRIDE INCOMPLETE";
  } else if (input.projectOverrideRate && (!input.overrideReason || !input.overrideApprovedBy)) {
    decision = "RATE OVERRIDE APPROVAL REQ.";
  } else if (input.workItemType === "ISSUE" && input.costingBasis === "") {
    decision = "COSTING BASIS REQUIRED";
  } else if (input.workItemType === "ISSUE" && input.costingBasis === "TEAM" && !input.teamName) {
    decision = "TEAM REQUIRED";
  } else if (input.workItemType === "ISSUE" && input.costingBasis === "LOCATION" && !input.locationName) {
    decision = "LOCATION REQUIRED";
  } else if (input.workItemType === "ISSUE" && input.costingBasis && !input.costMethod) {
    decision = "COST METHOD REQUIRED";
  } else {
    steps.push("Completeness gates passed → Final Planning Decision = Delivery Flag");
  }

  return {
    deliveryFlag,
    decision,
    explanation: {
      title: "Governance Decision",
      summary: `${deliveryFlag} / ${decision}`,
      steps,
    },
  };
}

function indexLevel(index: number, config: EstimationConfig) {
  if (index >= (config.indexSplitMin ?? 81)) return 2;
  if (index >= (config.indexReviewMin ?? 66)) return 1;
  return 0;
}

function structuralGate(scores: ComplexityScoreInput[]) {
  const ids = new Set(["functional", "technical", "integration", "data"]);
  return scores.some((s) => ids.has(s.dimensionId) && s.score === 5) ? 1 : 0;
}

function uncertaintyTierIsSpike(score: number, config: EstimationConfig) {
  const option = config.complexityDimensions.find((d) => d.id === "uncertainty")?.options?.[score - 1] ?? "";
  return option.toLowerCase().includes("discovery") || option.toLowerCase().includes("spike");
}
