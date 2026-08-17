import { round2 } from "./math";
import type { Explanation, TShirt, WorkItemType, EstimationConfig } from "./types";
import { lookupMapping } from "./storyPoints";

export function splitDevQa(
  totalSp: number,
  tshirt: TShirt,
  workItemType: WorkItemType,
  config: EstimationConfig,
): { devSp: number; qaSp: number; qaShare: number; refDevPd: number; refQaPd: number; explanation: Explanation } {
  const mapping = lookupMapping(workItemType, tshirt, config);
  const scale = mapping.totalSp === 0 ? 0 : totalSp / mapping.totalSp;
  const qaSp = round2(mapping.qaSp * scale);
  const devSp = round2(totalSp - qaSp);
  return {
    devSp,
    qaSp,
    qaShare: totalSp === 0 ? 0 : round2(qaSp / totalSp),
    refDevPd: round2(mapping.refDevPd * scale),
    refQaPd: round2(mapping.refQaPd * scale),
    explanation: {
      title: "Dev / QA Allocation",
      summary: `Dev ${devSp} SP + QA ${qaSp} SP`,
      steps: [
        `Issue/Epic Mapping for ${tshirt}: Dev ${mapping.devSp} / QA ${mapping.qaSp} / Total ${mapping.totalSp}`,
        scale === 1 ? "Selected SP matches mapping total." : `Scaled by ${round2(scale)} because selected SP differs.`,
      ],
    },
  };
}
