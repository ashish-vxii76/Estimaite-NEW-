import { describe, expect, it } from "vitest";
import {
  DEFAULT_CONFIG,
  calculateComplexityIndex,
  calculateEstimate,
  calculateRequiredSprints,
  calculateVariance,
  mapIndexToTshirt,
  type EstimateCalculationInput,
} from "@/domain/estimation";

function scores(fill: number, overrides: Record<string, number> = {}) {
  return DEFAULT_CONFIG.complexityDimensions.map((d) => ({
    dimensionId: d.id,
    score: overrides[d.id] ?? fill,
  }));
}

function ready(answer: "YES" | "PARTIAL" | "NO" = "YES") {
  return ["business", "acceptance", "dependencies", "architecture", "test"].map(
    (criterionId) => ({ criterionId, answer }),
  );
}

function baseInput(partial: Partial<EstimateCalculationInput> = {}): EstimateCalculationInput {
  return {
    workItemType: "ISSUE",
    complexityScores: scores(3),
    readiness: ready("YES"),
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
      {
        locationId: "uk",
        locationName: "United Kingdom",
        allocationPct: 100,
        dailyRate: 650,
        currency: "GBP",
      },
    ],
    currency: "GBP",
    ...partial,
  };
}

describe("complexity scoring", () => {
  it("uses SUM(score x weight) / SUM(maxScore x weight)", () => {
    const result = calculateComplexityIndex(scores(5), DEFAULT_CONFIG);
    expect(result.index).toBe(1);
    const mid = calculateComplexityIndex(scores(1), DEFAULT_CONFIG);
    expect(mid.index).toBe(0.2);
  });

  it("maps index to configured T-shirt bands", () => {
    expect(mapIndexToTshirt(0.1, DEFAULT_CONFIG)).toBe("XS");
    expect(mapIndexToTshirt(0.2, DEFAULT_CONFIG)).toBe("S");
    expect(mapIndexToTshirt(0.4, DEFAULT_CONFIG)).toBe("M");
    expect(mapIndexToTshirt(0.55, DEFAULT_CONFIG)).toBe("L");
    expect(mapIndexToTshirt(0.7, DEFAULT_CONFIG)).toBe("XL");
    expect(mapIndexToTshirt(0.9, DEFAULT_CONFIG)).toBe("XXL");
  });
});

describe("planning", () => {
  it("uses the slower stream and rounds up", () => {
    const result = calculateRequiredSprints({
      devSP: 8,
      qaSP: 5,
      devResources: 1,
      qaResources: 1,
      devCapacity: 3.15,
      qaCapacity: 7.7,
    });
    expect(result.devSprints).toBeCloseTo(2.5397, 3);
    expect(result.qaSprints).toBeCloseTo(0.6494, 3);
    expect(result.finalSprints).toBe(3);
  });
});

describe("calculateEstimate principles", () => {
  it("does not let AI reduce baseline SP", () => {
    const none = calculateEstimate(baseInput({ devAiProductivityPct: 0 }), DEFAULT_CONFIG);
    const ai = calculateEstimate(baseInput({ devAiProductivityPct: 0.1 }), DEFAULT_CONFIG);
    expect(ai.baselineSp).toBe(none.baselineSp);
    expect(ai.selectedSp).toBe(none.selectedSp);
    expect(ai.aiAdjustedDevCapacity).toBeCloseTo(none.devCapacity * 1.1);
  });

  it("keeps Dev SP + QA SP = Total SP", () => {
    const result = calculateEstimate(baseInput(), DEFAULT_CONFIG);
    expect(result.devSp + result.qaSp).toBeCloseTo(result.selectedSp, 6);
  });

  it("does not change SP when commercial rates change", () => {
    const a = calculateEstimate(baseInput({ resourceSprintRate: 1000 }), DEFAULT_CONFIG);
    const b = calculateEstimate(baseInput({ resourceSprintRate: 9000 }), DEFAULT_CONFIG);
    expect(a.selectedSp).toBe(b.selectedSp);
    expect(a.effectiveTshirt).toBe(b.effectiveTshirt);
    expect(a.adjustedTotalEffortPd).toBe(b.adjustedTotalEffortPd);
    expect(a.baselineDeliveryCost).not.toBe(b.baselineDeliveryCost);
  });

  it("applies stance by shifting one T-shirt", () => {
    const neutral = calculateEstimate(baseInput({ stance: "NEUTRAL" }), DEFAULT_CONFIG);
    const opt = calculateEstimate(baseInput({ stance: "OPTIMISTIC" }), DEFAULT_CONFIG);
    const pes = calculateEstimate(baseInput({ stance: "PESSIMISTIC" }), DEFAULT_CONFIG);
    expect(opt.effectiveTshirt).not.toBe(pes.effectiveTshirt);
    expect(neutral.assessedTshirt).toBe(opt.assessedTshirt);
  });

  it("retains automated SP when override is applied", () => {
    const result = calculateEstimate(
      baseInput({ overrideEnabled: true, overrideSp: 13 }),
      DEFAULT_CONFIG,
    );
    expect(result.baselineSp).toBe(8);
    expect(result.selectedSp).toBe(13);
  });

  it("uses team sprint rate without proration", () => {
    const result = calculateEstimate(
      baseInput({
        costingModel: "TEAM_SPRINT",
        availableDev: 1,
        availableQa: 1,
      }),
      DEFAULT_CONFIG,
    );
    expect(result.aiAdjustedDeliveryCost).toBe(result.finalSprints * 12000);
  });

  it("flags discovery when readiness is low", () => {
    const result = calculateEstimate(baseInput({ readiness: ready("NO") }), DEFAULT_CONFIG);
    expect(result.governanceDecision).toBe("DISCOVERY REQUIRED");
    expect(result.confidence).toBe("LOW");
  });
});

describe("portfolio roll-up", () => {
  it("aggregates register cost, effort, flags and T-shirt cost", async () => {
    const { rollupPortfolio } = await import("@/domain/estimation/portfolio");
    const result = rollupPortfolio(
      [
        {
          governanceDecision: "READY",
          effectiveTshirt: "M",
          aiAdjustedDeliveryCost: 9361,
          baselineDeliveryCost: 10000,
          adjustedTotalEffortPd: 100,
        },
        {
          governanceDecision: "SPLIT",
          effectiveTshirt: "XL",
          aiAdjustedDeliveryCost: 5000,
          baselineDeliveryCost: 5000,
          adjustedTotalEffortPd: 200,
        },
        {
          governanceDecision: "DECOMPOSE",
          effectiveTshirt: "XL",
          aiAdjustedDeliveryCost: 0,
          baselineDeliveryCost: 0,
          adjustedTotalEffortPd: 67.2,
        },
      ],
      20000,
    );
    expect(result.totalEstimates).toBe(3);
    expect(result.totalAiAdjustedCost).toBe(14361);
    expect(result.totalBaselineCost).toBe(15000);
    expect(result.totalEffortPd).toBe(367.2);
    expect(result.countByFlag.READY).toBe(1);
    expect(result.countByFlag.SPLIT).toBe(1);
    expect(result.countByFlag.DECOMPOSE).toBe(1);
    expect(result.costByTshirt.M).toBe(9361);
    expect(result.costByTshirt.XL).toBe(5000);
    expect(result.budgetRag).toBe("GREEN");
  });
});

describe("days/point calibration", () => {
  it("suggests current days/point times average actual/est ratio", async () => {
    const { calibrateDaysPerPoint } = await import("@/domain/estimation/calibration");
    const result = calibrateDaysPerPoint({
      levels: [
        { id: "beginner", name: "Beginner", daysPerPoint: 3.33 },
        { id: "intermediate", name: "Intermediate", daysPerPoint: 2 },
      ],
      samples: [{ resourceLevelId: "beginner", actualEstimatedEffortRatio: 2.14 }],
    });
    expect(result.rows[0]?.suggestedDaysPerPoint).toBe(7.13);
    expect(result.rows[0]?.samples).toBe(1);
    expect(result.rows[1]?.samples).toBe(0);
    expect(result.rows[1]?.suggestedDaysPerPoint).toBeNull();
    expect(result.overallAvgRatio).toBe(2.14);
  });
});

describe("variance", () => {
  it("interprets actual/estimated ratio", () => {
    const under = calculateVariance({
      actualDevPd: 12,
      actualQaPd: 8,
      actualSprints: 3,
      actualCost: 12000,
      estimatedDevPd: 10,
      estimatedQaPd: 5,
      estimatedSprints: 2,
      estimatedCost: 10000,
    });
    expect(under.actualEstimatedEffortRatio).toBeCloseTo(20 / 15);
    expect(under.interpretation).toContain("Underestimated");
  });
});
