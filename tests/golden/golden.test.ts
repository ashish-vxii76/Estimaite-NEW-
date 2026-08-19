import { describe, expect, it } from "vitest";
import {
  DEFAULT_CONFIG,
  calculateEstimate,
  type EstimateCalculationInput,
} from "@/domain/estimation";
import golden from "../golden/dataset.json";

const CRITERIA = [
  "business",
  "acceptance",
  "dependencies",
  "architecture",
  "test",
] as const;

function indiaRoster(): EstimateCalculationInput["roster"] {
  return [
    { roleStream: "DEV", location: "India", headcount: 1 },
    { roleStream: "QA", location: "India", headcount: 1 },
  ];
}

function inputFromCase(c: (typeof golden.cases)[number]): EstimateCalculationInput {
  return {
    workItemType: c.workItemType as EstimateCalculationInput["workItemType"],
    complexityScores: DEFAULT_CONFIG.complexityDimensions.map((d) => ({
      dimensionId: d.id,
      score: c.scores[d.id as keyof typeof c.scores],
    })),
    readiness: CRITERIA.map((criterionId, index) => ({
      criterionId,
      answer: index < c.readinessYesCount ? "YES" : "NO",
    })),
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
    costingBasis: c.costingBasis as EstimateCalculationInput["costingBasis"],
    teamName: c.teamName,
    costMethod: c.costMethod,
    roster: indiaRoster(),
    locationAllocations: [],
    currency: c.currency,
  };
}

describe("Golden Dataset regression (PRD Case A/B)", () => {
  for (const testCase of golden.cases) {
    it(testCase.id, () => {
      const result = calculateEstimate(inputFromCase(testCase), DEFAULT_CONFIG);
      const expected = testCase.expected as Record<string, unknown>;
      for (const [key, value] of Object.entries(expected)) {
        expect(result[key as keyof typeof result], key).toBe(value);
      }
    });
  }
});
