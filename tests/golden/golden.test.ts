import { describe, expect, it } from "vitest";
import {
  DEFAULT_CONFIG,
  calculateEstimate,
  type EstimateCalculationInput,
} from "@/domain/estimation";
import golden from "../golden/dataset.json";

function inputFromCase(c: (typeof golden.cases)[number]): EstimateCalculationInput {
  return {
    workItemType: c.workItemType as EstimateCalculationInput["workItemType"],
    complexityScores: DEFAULT_CONFIG.complexityDimensions.map((d) => ({
      dimensionId: d.id,
      score: c.scores[d.id as keyof typeof c.scores],
    })),
    readiness: ["business", "acceptance", "dependencies", "architecture", "test"].map(
      (criterionId) => ({
        criterionId,
        answer: c.readiness as "YES" | "PARTIAL" | "NO",
      }),
    ),
    stance: c.stance as EstimateCalculationInput["stance"],
    devResourceLevelId: c.devLevel,
    qaResourceLevelId: c.qaLevel,
    devAiProductivityPct: c.devAi,
    qaAiProductivityPct: c.qaAi,
    planningMode: c.planningMode as EstimateCalculationInput["planningMode"],
    availableDev: c.availableDev,
    availableQa: c.availableQa,
    targetSprints: c.targetSprints,
    costingModel: c.costingModel as EstimateCalculationInput["costingModel"],
    resourceSprintRate: c.resourceSprintRate,
    teamSprintRate: c.teamSprintRate,
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
  };
}

describe("Golden Dataset regression", () => {
  for (const testCase of golden.cases) {
    it(testCase.id, () => {
      const result = calculateEstimate(inputFromCase(testCase), DEFAULT_CONFIG);
      expect(result.assessedTshirt).toBe(testCase.expected.assessedTshirt);
      expect(result.selectedSp).toBe(testCase.expected.selectedSp);
      expect(result.devSp).toBe(testCase.expected.devSp);
      expect(result.qaSp).toBe(testCase.expected.qaSp);
      expect(result.requiredDev).toBe(testCase.expected.requiredDev);
      expect(result.requiredQa).toBe(testCase.expected.requiredQa);
      expect(result.finalSprints).toBe(testCase.expected.finalSprints);
      expect(result.baselineDeliveryCost).toBe(testCase.expected.baselineDeliveryCost);
      expect(result.aiAdjustedDeliveryCost).toBe(testCase.expected.aiAdjustedDeliveryCost);
      expect(result.governanceDecision).toBe(testCase.expected.governanceDecision);
    });
  }
});
