import { calculateEstimate } from "./calculate";
import { round2 } from "./math";
import type {
  ConfidenceLevel,
  EstimateCalculationInput,
  EstimationConfig,
  Explanation,
} from "./types";

/**
 * P50 / P80 confidence range on the AI-adjusted total cost (#17).
 *
 * Deterministic Monte-Carlo, fully formula-driven and reproducible:
 *  - the ONLY thing varied is the effective size (±1 T-shirt band), drawn from an explicit,
 *    confidence-driven probability over {smaller, same, bigger};
 *  - each drawn size is priced by the SAME deterministic engine (calculateEstimate);
 *  - the RNG is seeded from the estimate's own inputs, so identical inputs → identical P50/P80.
 * No ML, no Math.random. Every number stays inspectable (see the returned explanation).
 *
 * The distribution is skewed toward the PESSIMISTIC (bigger) side for lower confidence — a
 * symmetric spread would leave ~75% of the mass on the middle band, making P80 == P50 (useless),
 * and real-world uncertainty carries overrun risk, not symmetric risk. Higher confidence keeps it
 * tight (P80 == P50). Weights are explicit here so they stay auditable.
 */

// [ P(size −1 band) , P(same) , P(size +1 band) ] by confidence.
const SHIFT_WEIGHTS: Record<ConfidenceLevel, [number, number, number]> = {
  High: [0.05, 0.9, 0.05],
  Medium: [0.1, 0.65, 0.25],
  Low: [0.1, 0.5, 0.4],
  "Very Low": [0.05, 0.45, 0.5],
};

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedFrom(input: EstimateCalculationInput): number {
  const material = JSON.stringify([
    input.complexityScores,
    input.stance,
    input.workItemType,
    input.devResourceLevelId,
    input.qaResourceLevelId,
    input.devAiProductivityPct,
    input.qaAiProductivityPct,
    input.planningMode,
    input.availableDev,
    input.availableQa,
    input.targetSprints,
  ]);
  let h = 2166136261;
  for (let i = 0; i < material.length; i++) {
    h ^= material.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export type CostRange = {
  costP50: number | null;
  costP80: number | null;
  samples: number;
  explanation: Explanation;
};

export function simulateCostRange(
  input: EstimateCalculationInput,
  config: EstimationConfig,
  runs = 10000,
): CostRange {
  const base = calculateEstimate(input, config);
  const deferred = base.aiAdjustedTotalCost == null;
  if (deferred) {
    return {
      costP50: null,
      costP80: null,
      samples: 0,
      explanation: {
        title: "Cost Confidence Range (P50 / P80)",
        summary: "Deferred — no commercial cost for this work item",
        steps: ["Epic cost is deferred to Story level, so no cost range is computed."],
      },
    };
  }

  const weights = SHIFT_WEIGHTS[base.confidence] ?? SHIFT_WEIGHTS.Low;
  const [pDown, pSame] = weights;
  const rng = mulberry32(seedFrom(input));

  // Only three effective sizes are reachable (±1 band), so price each once and reuse.
  const costByShift = new Map<number, number>();
  const costForShift = (shift: number): number => {
    let c = costByShift.get(shift);
    if (c === undefined) {
      const r = calculateEstimate(input, config, { effectiveTshirtShift: shift });
      c = r.aiAdjustedTotalCost ?? base.aiAdjustedTotalCost ?? 0;
      costByShift.set(shift, c);
    }
    return c;
  };

  const costs: number[] = [];
  for (let i = 0; i < runs; i++) {
    const u = rng();
    const shift = u < pDown ? -1 : u < pDown + pSame ? 0 : 1;
    costs.push(costForShift(shift));
  }
  costs.sort((a, b) => a - b);
  const pctl = (p: number) => costs[Math.min(costs.length - 1, Math.floor(p * costs.length))];

  const costP50 = round2(pctl(0.5));
  const costP80 = round2(pctl(0.8));

  return {
    costP50,
    costP80,
    samples: costs.length,
    explanation: {
      title: "Cost Confidence Range (P50 / P80)",
      summary: `P50 ${costP50} · P80 ${costP80}`,
      steps: [
        `${runs} scenarios; only the effective size is varied (±1 band), priced by the same engine.`,
        `Confidence "${base.confidence}" → P(smaller/same/bigger) = ${pDown}/${pSame}/${round2(1 - pDown - pSame)}.`,
        `Costs by size shift: -1 → ${costForShift(-1)}, 0 → ${costForShift(0)}, +1 → ${costForShift(1)}.`,
        `Seed derived from the estimate inputs → identical inputs give identical P50/P80.`,
        `P50 (median) = ${costP50}; P80 (80th percentile) = ${costP80}.`,
      ],
    },
  };
}
