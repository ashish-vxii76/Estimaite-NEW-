import { round2 } from "./math";
import type {
  EstimationConfig,
  Explanation,
  TShirt,
  WorkItemType,
} from "./types";

export function lookupMapping(workItemType: WorkItemType, tshirt: TShirt, config: EstimationConfig) {
  if (workItemType === "EPIC") {
    const mapping = config.epicMappings.find((m) => m.tshirt === tshirt);
    if (!mapping) throw new Error(`No Epic mapping for ${tshirt}`);
    return {
      totalSp: mapping.romSp,
      devSp: mapping.devSp,
      qaSp: mapping.qaSp,
      refDevPd: mapping.devPd,
      refQaPd: mapping.qaPd,
      expectedStories: mapping.expectedStories,
    };
  }
  const mapping = config.issueMappings.find((m) => m.tshirt === tshirt);
  if (!mapping) throw new Error(`No Issue mapping for ${tshirt}`);
  return {
    totalSp: mapping.totalSp,
    devSp: mapping.devSp,
    qaSp: mapping.qaSp,
    refDevPd: mapping.devPd,
    refQaPd: mapping.qaPd,
    expectedStories: null as number | null,
  };
}

export function mapStoryPoints(
  workItemType: WorkItemType,
  tshirt: TShirt,
  config: EstimationConfig,
): { sp: number; explanation: Explanation } {
  const mapping = lookupMapping(workItemType, tshirt, config);
  return {
    sp: mapping.totalSp,
    explanation: {
      title: workItemType === "EPIC" ? "Epic ROM Story Points" : "Issue Canonical Story Points",
      summary: `${tshirt} → ${mapping.totalSp} SP (Dev ${mapping.devSp} / QA ${mapping.qaSp})`,
      steps: [`Looked up ${workItemType} Mapping for effective T-shirt ${tshirt}.`],
    },
  };
}
