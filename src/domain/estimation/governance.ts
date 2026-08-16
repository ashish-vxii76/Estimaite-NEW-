import type {
  EstimationConfig,
  Explanation,
  GovernanceDecision,
  TShirt,
  WorkItemType,
} from "./types";

export function decideGovernance(input: {
  workItemType: WorkItemType;
  assessedTshirt: TShirt;
  selectedSp: number;
  finalSprints: number;
  readinessScore: number;
  config: EstimationConfig;
}): { decision: GovernanceDecision; explanation: Explanation } {
  const steps: string[] = [];

  if (input.readinessScore < input.config.readinessDiscoveryMax) {
    steps.push(
      `Readiness ${input.readinessScore} < ${input.config.readinessDiscoveryMax} → DISCOVERY REQUIRED`,
    );
    return done("DISCOVERY REQUIRED", steps);
  }
  if (input.readinessScore < input.config.readinessSpikeMax) {
    steps.push(
      `Readiness ${input.readinessScore} < ${input.config.readinessSpikeMax} → SPIKE REQUIRED`,
    );
    return done("SPIKE REQUIRED", steps);
  }

  if (input.workItemType === "EPIC") {
    const splitThreshold = input.config.epicSplitSp;
    const decomposeThreshold = input.config.epicDecomposeSp;
    const mapped = input.config.epicMappings?.find((m) => m.tshirt === input.assessedTshirt);
    if (input.selectedSp >= splitThreshold || mapped?.governance === "SPLIT EPIC") {
      steps.push(`Epic ROM SP ${input.selectedSp} ≥ ${splitThreshold} (or mapping SPLIT EPIC)`);
      return done("SPLIT EPIC", steps);
    }
    if (input.selectedSp >= decomposeThreshold || mapped?.governance === "DECOMPOSE") {
      steps.push(`Epic ROM SP ${input.selectedSp} ≥ ${decomposeThreshold} (or mapping DECOMPOSE)`);
      return done("DECOMPOSE", steps);
    }
    steps.push("Epic is below decompose threshold → PLAN");
    return done(mapped?.governance ?? "PLAN", steps);
  }

  const mapping =
    input.config.issueMappings?.find((m) => m.tshirt === input.assessedTshirt) ??
    input.config.issueStoryPointMappings.find((m) => m.tshirt === input.assessedTshirt);
  const splitSp = input.config.issueSplitSp ?? 21;
  const reviewSp = input.config.issueReviewSp ?? 13;
  if (mapping && (mapping.governance === "SPLIT" || input.selectedSp >= splitSp)) {
    steps.push(
      `Issue ${input.assessedTshirt} mapping/threshold governance = SPLIT (split SP ${splitSp})`,
    );
    return done("SPLIT", steps);
  }

  if (input.finalSprints > input.config.issueMaxRecommendedSprints) {
    steps.push(
      `Elapsed ${input.finalSprints} sprints exceeds issue maximum recommended duration of ${input.config.issueMaxRecommendedSprints} → REVIEW`,
    );
    return done("REVIEW", steps);
  }

  if (mapping?.governance === "REVIEW" || input.selectedSp >= reviewSp) return done("REVIEW", steps);

  steps.push("Issue is within size and duration thresholds → READY");
  return done("READY", steps);
}

function done(decision: GovernanceDecision, steps: string[]) {
  return {
    decision,
    explanation: {
      title: "Governance Decision",
      summary: decision,
      steps,
    } satisfies Explanation,
  };
}
