import type {
  ComplexityScoreInput,
  ConfidenceLevel,
  DorStatus,
  EstimationConfig,
  Explanation,
} from "./types";

const CONFIDENCE_LABELS: ConfidenceLevel[] = ["Very Low", "Low", "Medium", "High"];

export function uncertaintyTier(score: number, config: EstimationConfig): number {
  const dimension = config.complexityDimensions.find((d) => d.id === "uncertainty");
  const option = dimension?.options?.[score - 1] ?? "";
  if (option.includes("clear") || option.includes("Minor")) return 4;
  if (option.includes("Material")) return 3;
  if (option.includes("Significant")) return 2;
  if (option.includes("Discovery") || option.includes("spike")) return 1;
  if (score <= 2) return 4;
  if (score === 3) return 3;
  if (score === 4) return 2;
  return 1;
}

export function calculateConfidence(input: {
  dorStatus: DorStatus;
  scores: ComplexityScoreInput[];
  config: EstimationConfig;
}): { confidence: ConfidenceLevel; explanation: Explanation } {
  const uncertaintyScore = input.scores.find((s) => s.dimensionId === "uncertainty")?.score ?? 3;
  const uTier = uncertaintyTier(uncertaintyScore, input.config);
  const dorTier =
    input.dorStatus === "Ready for Estimation" ? 4 : input.dorStatus === "Estimate with Assumptions" ? 3 : 2;
  const combined = Math.min(uTier, dorTier);
  const confidence = CONFIDENCE_LABELS[combined - 1] ?? "Very Low";
  return {
    confidence,
    explanation: {
      title: "Estimate Confidence",
      summary: confidence,
      steps: [
        `Uncertainty score ${uncertaintyScore} → tier ${uTier}`,
        `DoR status "${input.dorStatus}" → tier ${dorTier}`,
        `confidence = [Very Low, Low, Medium, High][min(${uTier}, ${dorTier}) − 1] = ${confidence}`,
      ],
    },
  };
}
