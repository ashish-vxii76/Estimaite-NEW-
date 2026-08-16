import type {
  ComplexityScoreInput,
  ConfidenceLevel,
  EstimationConfig,
  Explanation,
} from "./types";

export function calculateConfidence(input: {
  readinessScore: number;
  scores: ComplexityScoreInput[];
  config: EstimationConfig;
}): { confidence: ConfidenceLevel; explanation: Explanation } {
  const uncertainty =
    input.scores.find((s) => s.dimensionId === "uncertainty")?.score ?? 3;
  const dependency =
    input.scores.find((s) => s.dimensionId === "dependencies")?.score ?? 3;

  let confidence: ConfidenceLevel = "MEDIUM";
  const reasons: string[] = [
    `Readiness ${input.readinessScore}`,
    `Uncertainty score ${uncertainty}`,
    `Dependency score ${dependency}`,
  ];

  if (
    input.readinessScore < input.config.confidenceLowReadinessMax ||
    uncertainty >= input.config.confidenceLowUncertaintyMin
  ) {
    confidence = "LOW";
    reasons.push("Low confidence: weak readiness and/or high uncertainty.");
  } else if (
    input.readinessScore >= input.config.confidenceHighReadinessMin &&
    uncertainty <= input.config.confidenceHighUncertaintyMax &&
    dependency <= 3
  ) {
    confidence = "HIGH";
    reasons.push("High confidence: strong readiness and low uncertainty.");
  } else {
    reasons.push("Medium confidence: mixed readiness / complexity signals.");
  }

  return {
    confidence,
    explanation: {
      title: "Estimate Confidence",
      summary: confidence,
      steps: reasons,
    },
  };
}
