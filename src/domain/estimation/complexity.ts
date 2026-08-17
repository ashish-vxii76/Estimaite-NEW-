import type {
  ComplexityScoreInput,
  EstimationConfig,
  Explanation,
  TShirt,
} from "./types";
import { round0 } from "./math";

export function calculateComplexityIndex(
  scores: ComplexityScoreInput[],
  config: EstimationConfig,
): { index: number; indexPct: number; weightedSum: number; explanation: Explanation } {
  const active = config.complexityDimensions.filter((d) => d.active);
  let weighted = 0;
  const steps: string[] = [];

  for (const dimension of active) {
    const input = scores.find((s) => s.dimensionId === dimension.id);
    if (!input) throw new Error(`Missing complexity score for ${dimension.id}`);
    if (input.score < dimension.minScore || input.score > dimension.maxScore) {
      throw new Error(
        `Score for ${dimension.id} must be between ${dimension.minScore} and ${dimension.maxScore}`,
      );
    }
    weighted += input.score * dimension.weight;
    steps.push(`${dimension.name}: ${input.score} × ${dimension.weight} = ${input.score * dimension.weight}`);
  }

  const index = round0(20 * weighted);
  return {
    index,
    indexPct: index,
    weightedSum: weighted,
    explanation: {
      title: "Complexity Index",
      summary: `Complexity Index = ${index}`,
      steps: [
        ...steps,
        `Σ(score × weight) = ${weighted}`,
        `Index = round(20 × ${weighted}, 0) = ${index}`,
        "Theoretical range is 20 (all scores 1) to 100 (all scores 5) when weights sum to 1.00.",
      ],
    },
  };
}

export function mapIndexToTshirt(index: number, config: EstimationConfig): TShirt {
  const mappings = [...(config.complexityMappings ?? [])].sort((a, b) => a.lower - b.lower);
  const band = mappings.find((b) => index >= b.lower && index <= b.upper);
  if (band) return band.tshirt;
  if (index <= 20) return "XS";
  if (index <= 35) return "S";
  if (index <= 50) return "M";
  if (index <= 65) return "L";
  if (index <= 80) return "XL";
  return "XXL";
}
