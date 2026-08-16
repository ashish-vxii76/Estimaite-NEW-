import type {
  EstimationConfig,
  Explanation,
  TShirt,
  WorkItemType,
} from "./types";

export function mapStoryPoints(
  workItemType: WorkItemType,
  tshirt: TShirt,
  config: EstimationConfig,
): { sp: number; explanation: Explanation } {
  if (workItemType === "EPIC") {
    const mapping = config.epicRomMappings.find((m) => m.tshirt === tshirt);
    if (!mapping) throw new Error(`No Epic ROM mapping for ${tshirt}`);
    return {
      sp: mapping.romSp,
      explanation: {
        title: "Epic ROM Story Points",
        summary: `Epic ${tshirt} maps to ${mapping.romSp} ROM SP`,
        steps: [`Configured Epic ROM mapping: ${tshirt} → ${mapping.romSp}`],
      },
    };
  }

  const mapping = config.issueStoryPointMappings.find((m) => m.tshirt === tshirt);
  if (!mapping) throw new Error(`No Issue SP mapping for ${tshirt}`);
  return {
    sp: mapping.canonicalSp,
    explanation: {
      title: "Issue Canonical Story Points",
      summary: `Issue ${tshirt} maps to ${mapping.canonicalSp} SP`,
      steps: [
        `Configured Issue mapping: ${tshirt} → ${mapping.canonicalSp}`,
        "Automated S maps to 3. Two SP remains valid only for manual/team calibration.",
      ],
    },
  };
}
