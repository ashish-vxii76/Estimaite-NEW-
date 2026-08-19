import type { EstimationConfig, Explanation } from "./types";
import { round4 } from "./math";

export function getResourceLevel(levelId: string, config: EstimationConfig) {
  const level = config.resourceLevels.find((l) => l.id === levelId);
  if (!level) throw new Error(`Unknown resource level ${levelId}`);
  return level;
}

export function aiAdjustedCapacity(
  baseCapacity: number,
  aiPct: number,
  config: EstimationConfig,
): number {
  if (aiPct < config.aiMinPct || aiPct > config.aiMaxPct) {
    throw new Error(
      `AI productivity must be between ${config.aiMinPct} and ${config.aiMaxPct}`,
    );
  }
  return round4(baseCapacity * (1 + aiPct));
}

export function explainAiCapacity(
  role: "Dev" | "QA",
  base: number,
  aiPct: number,
  adjusted: number,
): Explanation {
  return {
    title: `${role} AI-Adjusted Capacity`,
    summary: `${adjusted} SP / resource / sprint`,
    steps: [
      `AI does not reduce scope. It only increases capacity.`,
      `${role} capacity = ${base} × (1 + ${aiPct}) = ${adjusted}`,
    ],
  };
}
