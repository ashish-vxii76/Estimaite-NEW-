import { describe, expect, it } from "vitest";
import {
  DEFAULT_CONFIG,
  calculateComplexityIndex,
  calculateEstimate,
  calculateRequiredSprints,
  calculateVariance,
  mapIndexToTshirt,
  planDelivery,
  type EstimateCalculationInput,
} from "@/domain/estimation";

function scores(fill: number, overrides: Record<string, number> = {}) {
  return DEFAULT_CONFIG.complexityDimensions.map((d) => ({
    dimensionId: d.id,
    score: overrides[d.id] ?? fill,
  }));
}

function ready(yesCount: number) {
  return ["business", "acceptance", "dependencies", "architecture", "test"].map(
    (criterionId, index) => ({
      criterionId,
      answer: (index < yesCount ? "YES" : "NO") as "YES" | "NO",
    }),
  );
}

function baseInput(partial: Partial<EstimateCalculationInput> = {}): EstimateCalculationInput {
  return {
    workItemType: "ISSUE",
    complexityScores: scores(3),
    readiness: ready(5),
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
        currency: "CHF",
      },
    ],
    currency: "CHF",
    ...partial,
  };
}

describe("complexity scoring", () => {
  it("uses round(20 × Σ(score × weight), 0) with weights summing to 1", () => {
    const allFive = calculateComplexityIndex(scores(5), DEFAULT_CONFIG);
    expect(allFive.index).toBe(100);
    const allOne = calculateComplexityIndex(scores(1), DEFAULT_CONFIG);
    expect(allOne.index).toBe(20);
    const caseA = calculateComplexityIndex(scores(4, { functional: 3, data: 3 }), DEFAULT_CONFIG);
    expect(caseA.index).toBe(75);
  });

  it("maps index to inclusive T-shirt bands", () => {
    expect(mapIndexToTshirt(20, DEFAULT_CONFIG)).toBe("XS");
    expect(mapIndexToTshirt(21, DEFAULT_CONFIG)).toBe("S");
    expect(mapIndexToTshirt(36, DEFAULT_CONFIG)).toBe("M");
    expect(mapIndexToTshirt(51, DEFAULT_CONFIG)).toBe("L");
    expect(mapIndexToTshirt(66, DEFAULT_CONFIG)).toBe("XL");
    expect(mapIndexToTshirt(81, DEFAULT_CONFIG)).toBe("XXL");
    expect(mapIndexToTshirt(75, DEFAULT_CONFIG)).toBe("XL");
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

  it("never prorates the selected resource-sprint rate by utilisation", () => {
    const result = calculateEstimate(
      baseInput({
        availableDev: 1,
        availableQa: 1,
      }),
      DEFAULT_CONFIG,
    );
    expect(result.utilisation).toBe(20);
    expect(result.selectedRate).toBe(4000);
    expect(result.baselineDeliveryCost).toBe(
      result.plannedResources * result.finalSprints * result.selectedRate,
    );
  });

  it("flags discovery when readiness is low", () => {
    const result = calculateEstimate(baseInput({ readiness: ready(0) }), DEFAULT_CONFIG);
    expect(result.dorStatus).toBe("Discovery Required");
    expect(result.governanceDecision).toBe("DISCOVERY REQUIRED");
    expect(result.confidence).toBe("Low");
  });

  it("defers commercial cost on epics", () => {
    const result = calculateEstimate(
      baseInput({
        workItemType: "EPIC",
        complexityScores: scores(4, { applications: 3 }),
      }),
      DEFAULT_CONFIG,
    );
    expect(result.assessedTshirt).toBe("XL");
    expect(result.selectedSp).toBe(120);
    expect(result.baselineDeliveryCost).toBeNull();
    expect(result.aiAdjustedDeliveryCost).toBeNull();
    expect(result.costApplicability).toContain("COST DEFERRED");
  });
});

describe("portfolio roll-up", () => {
  it("aggregates register cost, effort, flags and T-shirt cost", async () => {
    const { rollupPortfolio } = await import("@/domain/estimation/portfolio");
    const result = rollupPortfolio(
      [
        {
          governanceDecision: "READY",
          deliveryFlag: "READY",
          effectiveTshirt: "M",
          aiAdjustedDeliveryCost: 9361,
          baselineDeliveryCost: 10000,
          adjustedTotalEffortPd: 100,
        },
        {
          governanceDecision: "SPLIT",
          deliveryFlag: "SPLIT",
          effectiveTshirt: "XL",
          aiAdjustedDeliveryCost: 5000,
          baselineDeliveryCost: 5000,
          adjustedTotalEffortPd: 200,
        },
        {
          governanceDecision: "DECOMPOSE",
          deliveryFlag: "DECOMPOSE",
          effectiveTshirt: "XL",
          aiAdjustedDeliveryCost: null,
          baselineDeliveryCost: null,
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

  it("marks AMBER when total is within 10% over budget", async () => {
    const { budgetStatus } = await import("@/domain/estimation/portfolio");
    expect(budgetStatus(100, 100).rag).toBe("GREEN");
    expect(budgetStatus(105, 100).rag).toBe("AMBER");
    expect(budgetStatus(111, 100).rag).toBe("RED");
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

describe("sprint-constrained capacity (PRD §6.5 — AI-adjusted)", () => {
  it("sizes required resources on AI-ADJUSTED capacity, per §6.5", () => {
    // §6.5: req_dev = max(1, roundup(dev_sp / (target_sprints × ai_dev_capacity))).
    // AI doubles capacity (base 5 -> AI 10): AI sizing needs 1 Dev / 1 QA.
    // (Base sizing would have given 2 Dev — that is NOT what the PRD specifies.)
    const plan = planDelivery({
      mode: "SPRINT_CONSTRAINED",
      devSP: 20,
      qaSP: 10,
      availableDev: 99, // ignored in sprint-constrained
      availableQa: 99,
      targetSprints: 2,
      baseDevCapacity: 5,
      baseQaCapacity: 5,
      aiDevCapacity: 10,
      aiQaCapacity: 10,
    });
    expect(plan.requiredDev).toBe(1); // max(1, ROUNDUP(20 / (2 × 10 AI)))
    expect(plan.requiredQa).toBe(1); // max(1, ROUNDUP(10 / (2 × 10 AI)))
    expect(plan.plannedDev).toBe(1);
    expect(plan.plannedQa).toBe(1);
  });

  it("derives elapsed sprints from AI-adjusted capacity too (§6.5)", () => {
    const plan = planDelivery({
      mode: "SPRINT_CONSTRAINED",
      devSP: 20,
      qaSP: 10,
      availableDev: 99,
      availableQa: 99,
      targetSprints: 2,
      baseDevCapacity: 5,
      baseQaCapacity: 5,
      aiDevCapacity: 10,
      aiQaCapacity: 10,
    });
    // calculated_sprints = roundup(max(20/(1×10), 10/(1×10))) = roundup(2) = 2
    expect(plan.finalSprints).toBe(2);
  });
});
