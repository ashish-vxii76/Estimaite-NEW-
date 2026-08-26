import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { DEFAULT_CONFIG, calculateEstimate, type EstimateCalculationInput } from "@/domain/estimation";

const DIM_IDS = DEFAULT_CONFIG.complexityDimensions.map((d) => d.id);
const CRITERIA = ["business", "acceptance", "dependencies", "architecture", "test"];

/** Build a valid engine input from random-but-in-range primitives. */
function inputFrom(opts: {
  scores: number[];
  workItemType: "ISSUE" | "EPIC";
  stance: "OPTIMISTIC" | "NEUTRAL" | "PESSIMISTIC";
  devAi: number;
  qaAi: number;
  yesCount: number;
}): EstimateCalculationInput {
  return {
    workItemType: opts.workItemType,
    complexityScores: DIM_IDS.map((id, i) => ({ dimensionId: id, score: opts.scores[i] })),
    readiness: CRITERIA.map((criterionId, i) => ({
      criterionId,
      answer: i < opts.yesCount ? "YES" : "NO",
    })),
    stance: opts.stance,
    devResourceLevelId: "intermediate",
    qaResourceLevelId: "experienced",
    devAiProductivityPct: opts.devAi,
    qaAiProductivityPct: opts.qaAi,
    planningMode: "RESOURCE_CONSTRAINED",
    availableDev: 2,
    availableQa: 2,
    targetSprints: 2,
    costingModel: "RESOURCE_SPRINT",
    resourceSprintRate: 4000,
    teamSprintRate: 12000,
    otherFixedCost: 0,
    locationAllocations: [
      { locationId: "uk", locationName: "United Kingdom", allocationPct: 100, dailyRate: 650, currency: "CHF" },
    ],
    currency: "CHF",
  };
}

const arbScores = fc.array(fc.integer({ min: 1, max: 5 }), { minLength: DIM_IDS.length, maxLength: DIM_IDS.length });
const arbAi = fc.integer({ min: 0, max: 100 }).map((n) => n / 100);
const arbStance = fc.constantFrom("OPTIMISTIC", "NEUTRAL", "PESSIMISTIC" as const);
const arbType = fc.constantFrom("ISSUE", "EPIC" as const);
const arbYes = fc.integer({ min: 0, max: 5 });

const T_SHIRTS = ["XS", "S", "M", "L", "XL", "XXL"];

describe("engine invariants (property-based)", () => {
  it("complexity index is always within [20, 100]", () => {
    fc.assert(
      fc.property(arbScores, (scores) => {
        const r = calculateEstimate(inputFrom({ scores, workItemType: "ISSUE", stance: "NEUTRAL", devAi: 0, qaAi: 0, yesCount: 5 }), DEFAULT_CONFIG);
        return r.complexityIndex >= 20 && r.complexityIndex <= 100;
      }),
    );
  });

  it("effective T-shirt is always a valid size", () => {
    fc.assert(
      fc.property(arbScores, arbStance, arbType, (scores, stance, workItemType) => {
        const r = calculateEstimate(inputFrom({ scores, workItemType, stance, devAi: 0, qaAi: 0, yesCount: 5 }), DEFAULT_CONFIG);
        return T_SHIRTS.includes(r.effectiveTshirt);
      }),
    );
  });

  it("Dev SP + QA SP always equals selected SP (within rounding)", () => {
    fc.assert(
      fc.property(arbScores, arbType, arbStance, (scores, workItemType, stance) => {
        const r = calculateEstimate(inputFrom({ scores, workItemType, stance, devAi: 0, qaAi: 0, yesCount: 5 }), DEFAULT_CONFIG);
        return Math.abs(r.devSp + r.qaSp - r.selectedSp) < 0.01;
      }),
    );
  });

  it("AI never reduces baseline SP (AI only affects capacity/effort/cost)", () => {
    fc.assert(
      fc.property(arbScores, arbType, arbAi, arbAi, (scores, workItemType, devAi, qaAi) => {
        const noAi = calculateEstimate(inputFrom({ scores, workItemType, stance: "NEUTRAL", devAi: 0, qaAi: 0, yesCount: 5 }), DEFAULT_CONFIG);
        const withAi = calculateEstimate(inputFrom({ scores, workItemType, stance: "NEUTRAL", devAi, qaAi, yesCount: 5 }), DEFAULT_CONFIG);
        return withAi.baselineSp === noAi.baselineSp && withAi.selectedSp === noAi.selectedSp;
      }),
    );
  });

  it("commercial rates never change sizing or effort", () => {
    fc.assert(
      fc.property(arbScores, fc.integer({ min: 500, max: 50000 }), (scores, rate) => {
        const base = calculateEstimate(inputFrom({ scores, workItemType: "ISSUE", stance: "NEUTRAL", devAi: 0, qaAi: 0, yesCount: 5 }), DEFAULT_CONFIG);
        const other = calculateEstimate({ ...inputFrom({ scores, workItemType: "ISSUE", stance: "NEUTRAL", devAi: 0, qaAi: 0, yesCount: 5 }), resourceSprintRate: rate }, DEFAULT_CONFIG);
        return base.selectedSp === other.selectedSp && base.adjustedTotalEffortPd === other.adjustedTotalEffortPd;
      }),
    );
  });
});
