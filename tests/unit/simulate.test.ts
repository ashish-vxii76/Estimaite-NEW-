import { describe, expect, it } from "vitest";
import {
  DEFAULT_CONFIG,
  calculateEstimate,
  simulateCostRange,
  type EstimateCalculationInput,
} from "@/domain/estimation";

function input(partial: Partial<EstimateCalculationInput> = {}): EstimateCalculationInput {
  return {
    workItemType: "ISSUE",
    complexityScores: DEFAULT_CONFIG.complexityDimensions.map((d) => ({ dimensionId: d.id, score: 4 })),
    // low DoR → lower confidence → a meaningful range
    readiness: ["business", "acceptance", "dependencies", "architecture", "test"].map((criterionId, i) => ({
      criterionId,
      answer: (i < 2 ? "YES" : "NO") as "YES" | "NO",
    })),
    stance: "NEUTRAL",
    devResourceLevelId: "intermediate",
    qaResourceLevelId: "experienced",
    devAiProductivityPct: 0,
    qaAiProductivityPct: 0,
    planningMode: "RESOURCE_CONSTRAINED",
    availableDev: 1,
    availableQa: 1,
    targetSprints: 2,
    costingModel: "RESOURCE_SPRINT",
    resourceSprintRate: 4000,
    teamSprintRate: 12000,
    otherFixedCost: 0,
    locationAllocations: [
      { locationId: "uk", locationName: "United Kingdom", allocationPct: 100, dailyRate: 650, currency: "CHF" },
    ],
    currency: "CHF",
    ...partial,
  };
}

describe("cost confidence range (#17 — deterministic Monte Carlo)", () => {
  it("is deterministic: identical inputs give identical P50/P80", () => {
    const a = simulateCostRange(input(), DEFAULT_CONFIG);
    const b = simulateCostRange(input(), DEFAULT_CONFIG);
    expect(a.costP50).toBe(b.costP50);
    expect(a.costP80).toBe(b.costP80);
  });

  it("P80 >= P50 > 0, and P50 equals the neutral (unshifted) cost", () => {
    const neutral = calculateEstimate(input(), DEFAULT_CONFIG).aiAdjustedTotalCost;
    const r = simulateCostRange(input(), DEFAULT_CONFIG);
    expect(r.costP50).toBeGreaterThan(0);
    expect(r.costP50).toBe(neutral);
    expect(r.costP80).toBeGreaterThanOrEqual(r.costP50!);
  });

  it("a bigger effective size (+1 band) costs more — drives the P80 tail", () => {
    const neutral = calculateEstimate(input(), DEFAULT_CONFIG).aiAdjustedTotalCost!;
    const bigger = calculateEstimate(input(), DEFAULT_CONFIG, { effectiveTshirtShift: 1 }).aiAdjustedTotalCost!;
    expect(bigger).toBeGreaterThan(neutral);
  });

  it("low confidence yields a wider P80 than high confidence", () => {
    const low = simulateCostRange(input({ readiness: input().readiness }), DEFAULT_CONFIG); // low DoR
    const high = simulateCostRange(
      input({ readiness: ["business", "acceptance", "dependencies", "architecture", "test"].map((c) => ({ criterionId: c, answer: "YES" as const })) }),
      DEFAULT_CONFIG,
    );
    // high confidence keeps P80 at the neutral cost; low confidence pushes it up
    expect(low.costP80!).toBeGreaterThanOrEqual(high.costP80!);
  });

  it("returns null for an Epic (cost deferred)", () => {
    const r = simulateCostRange(input({ workItemType: "EPIC" }), DEFAULT_CONFIG);
    expect(r.costP50).toBeNull();
    expect(r.costP80).toBeNull();
  });
});
