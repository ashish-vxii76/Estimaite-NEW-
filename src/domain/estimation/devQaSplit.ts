import { round2 } from "./math";
import type {
  EstimationConfig,
  Explanation,
  TShirt,
  WorkItemType,
} from "./types";

export function splitDevQa(
  totalSp: number,
  tshirt: TShirt,
  workItemType: WorkItemType,
  config: EstimationConfig,
): { devSp: number; qaSp: number; qaShare: number; explanation: Explanation } {
  const mapping =
    workItemType === "EPIC"
      ? config.epicMappings?.find((m) => m.tshirt === tshirt) ??
        config.epicMappings?.find((m) => m.romSp === totalSp)
      : config.issueMappings?.find((m) => m.totalSp === totalSp) ??
        config.issueMappings?.find((m) => m.tshirt === tshirt);

  if (mapping) {
    const mappedTotal = "totalSp" in mapping ? mapping.totalSp : mapping.romSp;
    const scale = mappedTotal === 0 ? 0 : totalSp / mappedTotal;
    const qaSp = round2(mapping.qaSp * scale);
    const devSp = round2(totalSp - qaSp);
    const qaShare = totalSp === 0 ? 0 : round2(qaSp / totalSp);
    return {
      devSp,
      qaSp,
      qaShare,
      explanation: {
        title: "Dev / QA Allocation",
        summary: `Dev ${devSp} SP + QA ${qaSp} SP = ${round2(devSp + qaSp)} SP`,
        steps: [
          `Allocation is taken from the configured ${workItemType === "EPIC" ? "Epic" : "Issue"} Mapping for ${tshirt}.`,
          `Mapped Dev SP ${mapping.devSp} / QA SP ${mapping.qaSp} against mapped total ${mappedTotal}.`,
          scale === 1
            ? "Selected SP matches the mapping total, so the configured split is used directly."
            : `Selected SP ${totalSp} ≠ mapped total ${mappedTotal}; split is scaled by ${round2(scale)}.`,
          `Dev SP + QA SP = Total SP.`,
        ],
      },
    };
  }

  const qaShare = 0.3;
  const qaSp = round2(totalSp * qaShare);
  const devSp = round2(totalSp - qaSp);
  return {
    devSp,
    qaSp,
    qaShare,
    explanation: {
      title: "Dev / QA Allocation",
      summary: `Dev ${devSp} SP + QA ${qaSp} SP = ${round2(devSp + qaSp)} SP`,
      steps: [
        "No Issue/Epic mapping row found; fallback 70/30 Dev/QA split applied.",
        `QA SP = ${totalSp} × 0.3 = ${qaSp}`,
      ],
    },
  };
}
