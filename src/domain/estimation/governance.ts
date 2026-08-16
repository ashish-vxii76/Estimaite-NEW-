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
    if (input.selectedSp >= input.config.epicSplitSp) {
      steps.push(`Epic ROM SP ${input.selectedSp} ≥ ${input.config.epicSplitSp} → SPLIT EPIC`);
      return done("SPLIT EPIC", steps);
    }
    if (input.selectedSp >= input.config.epicDecomposeSp) {
      steps.push(
        `Epic ROM SP ${input.selectedSp} ≥ ${input.config.epicDecomposeSp} → DECOMPOSE`,
      );
      return done("DECOMPOSE", steps);
    }
    steps.push("Epic is below decompose threshold → PLAN");
    return done("PLAN", steps);
  }

  const mapping = input.config.issueStoryPointMappings.find(
    (m) => m.tshirt === input.assessedTshirt,
  );
  if (mapping && (mapping.governance === "SPLIT" || mapping.governance === "REVIEW")) {
    steps.push(
      `Issue ${input.assessedTshirt} mapping governance = ${mapping.governance}`,
    );
    if (mapping.governance === "SPLIT") return done("SPLIT", steps);
  }

  if (input.finalSprints > input.config.issueMaxRecommendedSprints) {
    steps.push(
      `Elapsed ${input.finalSprints} sprints exceeds issue maximum recommended duration of ${input.config.issueMaxRecommendedSprints} → REVIEW`,
    );
    return done("REVIEW", steps);
  }

  if (mapping?.governance === "REVIEW") return done("REVIEW", steps);

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
