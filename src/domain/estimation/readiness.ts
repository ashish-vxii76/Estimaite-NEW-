import type { DorStatus, Explanation, ReadinessInput } from "./types";

export const DEFAULT_READINESS_CRITERIA = [
  { id: "business", label: "Business requirements understood" },
  { id: "acceptance", label: "Acceptance criteria defined" },
  { id: "dependencies", label: "Dependencies understood" },
  { id: "architecture", label: "Architecture / design sufficiently known" },
  { id: "test", label: "Test requirements understood" },
] as const;

export function calculateReadiness(
  readiness: ReadinessInput[],
  opts?: { criteriaCount?: number; assumptionsMin?: number },
): {
  score: number;
  status: DorStatus;
  explanation: Explanation;
} {
  if (readiness.length === 0) {
    throw new Error("Definition of Ready answers are required");
  }
  const score = readiness.filter((item) => item.answer === "YES").length;
  const criteriaCount = Math.max(opts?.criteriaCount ?? readiness.length, 1);
  const assumptionsMin = opts?.assumptionsMin ?? Math.min(3, criteriaCount);
  const status: DorStatus =
    score >= criteriaCount
      ? "Ready for Estimation"
      : score >= assumptionsMin
        ? "Estimate with Assumptions"
        : "Discovery Required";
  return {
    score,
    status,
    explanation: {
      title: "Definition of Ready",
      summary: `${score}/${criteriaCount} — ${status}`,
      steps: [
        ...readiness.map((r) => `${r.criterionId}: ${r.answer}`),
        `DoR Score = count of Yes = ${score}`,
        `DoR Status = ${status} (ready at ${criteriaCount}, assumptions at ${assumptionsMin})`,
      ],
    },
  };
}
