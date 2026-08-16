import { clamp, round2 } from "./math";
import type {
  ComplexityScoreInput,
  EstimationConfig,
  Explanation,
} from "./types";

export function splitDevQa(
  totalSp: number,
  scores: ComplexityScoreInput[],
  config: EstimationConfig,
): { devSp: number; qaSp: number; qaShare: number; explanation: Explanation } {
  const qaScore = scores.find((s) => s.dimensionId === "qa")?.score ?? 1;
  const nfrScore = scores.find((s) => s.dimensionId === "nfr")?.score ?? 1;
  const qaShare = clamp(
    config.qaSplitBase +
      (qaScore / 5) * config.qaSplitFromQaScore +
      (nfrScore / 5) * config.qaSplitFromNfrScore,
    config.qaSplitMin,
    config.qaSplitMax,
  );
  const qaSp = round2(totalSp * qaShare);
  const devSp = round2(totalSp - qaSp);

  return {
    devSp,
    qaSp,
    qaShare: round2(qaShare),
    explanation: {
      title: "Dev / QA Allocation",
      summary: `Dev ${devSp} SP + QA ${qaSp} SP = ${round2(devSp + qaSp)} SP`,
      steps: [
        `QA share = clamp(${config.qaSplitBase} + (QA score ${qaScore}/5)×${config.qaSplitFromQaScore} + (NFR score ${nfrScore}/5)×${config.qaSplitFromNfrScore}, ${config.qaSplitMin}, ${config.qaSplitMax})`,
        `QA share = ${round2(qaShare)}`,
        `QA SP = ${totalSp} × ${round2(qaShare)} = ${qaSp}`,
        `Dev SP = ${totalSp} − ${qaSp} = ${devSp}`,
        "Invariant: Dev SP + QA SP = Total SP. Streams remain independent downstream.",
      ],
    },
  };
}
