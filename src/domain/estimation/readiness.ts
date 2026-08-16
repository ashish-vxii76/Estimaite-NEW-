import type { Explanation, ReadinessInput } from "./types";
import { round4 } from "./math";

const ANSWER_VALUE = { YES: 1, PARTIAL: 0.5, NO: 0 } as const;

export const DEFAULT_READINESS_CRITERIA = [
  { id: "business", label: "Business requirements understood" },
  { id: "acceptance", label: "Acceptance criteria defined" },
  { id: "dependencies", label: "Dependencies understood" },
  { id: "architecture", label: "Architecture / design sufficiently known" },
  { id: "test", label: "Test requirements understood" },
] as const;

export function calculateReadiness(readiness: ReadinessInput[]): {
  score: number;
  explanation: Explanation;
} {
  if (readiness.length === 0) {
    throw new Error("Definition of Ready answers are required");
  }
  const total = readiness.reduce((sum, item) => sum + ANSWER_VALUE[item.answer], 0);
  const score = round4(total / readiness.length);
  return {
    score,
    explanation: {
      title: "Definition of Ready",
      summary: `Readiness score ${score}`,
      steps: [
        ...readiness.map(
          (r) => `${r.criterionId}: ${r.answer} → ${ANSWER_VALUE[r.answer]}`,
        ),
        `Average = ${total} / ${readiness.length} = ${score}`,
      ],
    },
  };
}
