import type {
  ComplexityScoreInput,
  EstimationConfig,
  Explanation,
  TShirt,
} from "./types";
import { round4 } from "./math";

export function calculateComplexityIndex(
  scores: ComplexityScoreInput[],
  config: EstimationConfig,
): { index: number; indexPct: number; explanation: Explanation } {
  const active = config.complexityDimensions.filter((d) => d.active);
  let weighted = 0;
  let maxWeighted = 0;
  const steps: string[] = [];

  for (const dimension of active) {
    const input = scores.find((s) => s.dimensionId === dimension.id);
    if (!input) {
      throw new Error(`Missing complexity score for ${dimension.id}`);
    }
    if (input.score < dimension.minScore || input.score > dimension.maxScore) {
      throw new Error(
        `Score for ${dimension.id} must be between ${dimension.minScore} and ${dimension.maxScore}`,
      );
    }
    weighted += input.score * dimension.weight;
    maxWeighted += dimension.maxScore * dimension.weight;
    steps.push(
      `${dimension.name}: ${input.score} × weight ${dimension.weight} = ${input.score * dimension.weight}`,
    );
  }

  if (maxWeighted === 0) {
    throw new Error("No active complexity dimensions configured");
  }

  const index = round4(weighted / maxWeighted);
  return {
    index,
    indexPct: round4(index * 100),
    explanation: {
      title: "Complexity Index",
      summary: `Complexity Index = ${index} (${index * 100}%)`,
      steps: [
        ...steps,
        `SUM(score × weight) = ${weighted}`,
        `SUM(maxScore × weight) = ${maxWeighted}`,
        `Index = ${weighted} / ${maxWeighted} = ${index}`,
      ],
    },
  };
}

export function mapIndexToTshirt(
  index: number,
  config: EstimationConfig,
): TShirt {
  const band = config.complexityBands.find(
    (b) => index >= b.minInclusive && index < b.maxExclusive,
  );
  if (!band) {
    throw new Error(`No complexity band configured for index ${index}`);
  }
  return band.tshirt;
}
