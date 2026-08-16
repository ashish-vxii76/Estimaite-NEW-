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
    const mapping =
      config.epicMappings?.find((m) => m.tshirt === tshirt) ??
      config.epicRomMappings.find((m) => m.tshirt === tshirt);
    if (!mapping) throw new Error(`No Epic ROM mapping for ${tshirt}`);
    const romSp = mapping.romSp;
    return {
      sp: romSp,
      explanation: {
        title: "Epic ROM Story Points",
        summary: `Epic ${tshirt} maps to ${romSp} ROM SP`,
        steps: [`Configured Epic Mapping: ${tshirt} → ${romSp} ROM SP`],
      },
    };
  }

  const mapping =
    config.issueMappings?.find((m) => m.tshirt === tshirt) ??
    config.issueStoryPointMappings.find((m) => m.tshirt === tshirt);
  if (!mapping) throw new Error(`No Issue SP mapping for ${tshirt}`);
  const sp = "totalSp" in mapping ? mapping.totalSp : mapping.canonicalSp;
  return {
    sp,
    explanation: {
      title: "Issue Canonical Story Points",
      summary: `Issue ${tshirt} maps to ${sp} SP`,
      steps: [
        `Configured Issue Mapping: ${tshirt} → ${sp}`,
        "Automated S maps to 3. Two SP remains valid only for manual/team calibration.",
      ],
    },
  };
}
