import { round4, roundUp } from "./math";
import type { Explanation, PlanningMode } from "./types";

export function calculateRequiredSprints(input: {
  devSP: number;
  qaSP: number;
  devResources: number;
  qaResources: number;
  devCapacity: number;
  qaCapacity: number;
}): {
  devSprints: number;
  qaSprints: number;
  finalSprints: number;
  explanation: Explanation;
} {
  if (input.devResources < 0 || input.qaResources < 0) {
    throw new Error("Resource counts must be non-negative");
  }
  if (input.devResources === 0 && input.devSP > 0) {
    throw new Error("At least one Dev resource is required when Dev SP > 0");
  }
  if (input.qaResources === 0 && input.qaSP > 0) {
    throw new Error("At least one QA resource is required when QA SP > 0");
  }

  const devSprints =
    input.devSP === 0 ? 0 : input.devSP / (input.devResources * input.devCapacity);
  const qaSprints =
    input.qaSP === 0 ? 0 : input.qaSP / (input.qaResources * input.qaCapacity);
  const finalSprints = roundUp(Math.max(devSprints, qaSprints));

  return {
    devSprints: round4(devSprints),
    qaSprints: round4(qaSprints),
    finalSprints,
    explanation: {
      title: "Final Sprints (Resource-Constrained)",
      summary: `${finalSprints} sprint(s)`,
      steps: [
        `Dev sprints = ${input.devSP} / (${input.devResources} × ${input.devCapacity}) = ${round4(devSprints)}`,
        `QA sprints = ${input.qaSP} / (${input.qaResources} × ${input.qaCapacity}) = ${round4(qaSprints)}`,
        `Elapsed duration is governed by the slower stream: MAX(${round4(devSprints)}, ${round4(qaSprints)})`,
        `Final Sprints = ROUNDUP(${round4(Math.max(devSprints, qaSprints))}) = ${finalSprints}`,
      ],
    },
  };
}

export function calculateRequiredResources(input: {
  devSP: number;
  qaSP: number;
  targetSprints: number;
  devCapacity: number;
  qaCapacity: number;
}): {
  requiredDev: number;
  requiredQa: number;
  explanation: Explanation;
} {
  if (input.targetSprints < 1) {
    throw new Error("Target sprints must be >= 1");
  }
  const requiredDev = roundUp(input.devSP / (input.targetSprints * input.devCapacity));
  const requiredQa = roundUp(input.qaSP / (input.targetSprints * input.qaCapacity));
  return {
    requiredDev: Math.max(requiredDev, input.devSP > 0 ? 1 : 0),
    requiredQa: Math.max(requiredQa, input.qaSP > 0 ? 1 : 0),
    explanation: {
      title: "Required Resources (Sprint-Constrained)",
      summary: `Dev ${requiredDev}, QA ${requiredQa}`,
      steps: [
        `Required Dev = ROUNDUP(${input.devSP} / (${input.targetSprints} × ${input.devCapacity})) = ${requiredDev}`,
        `Required QA = ROUNDUP(${input.qaSP} / (${input.targetSprints} × ${input.qaCapacity})) = ${requiredQa}`,
      ],
    },
  };
}

export function planDelivery(input: {
  mode: PlanningMode;
  devSP: number;
  qaSP: number;
  availableDev: number;
  availableQa: number;
  targetSprints: number;
  baseDevCapacity: number;
  baseQaCapacity: number;
  aiDevCapacity: number;
  aiQaCapacity: number;
}): {
  plannedDev: number;
  plannedQa: number;
  requiredDev: number;
  requiredQa: number;
  devSprints: number;
  qaSprints: number;
  calculatedSprints: number;
  finalSprints: number;
  explanation: Explanation;
} {
  if (!Number.isInteger(input.availableDev) || !Number.isInteger(input.availableQa)) {
    throw new Error("Resource counts must be whole numbers");
  }

  if (input.mode === "SPRINT_CONSTRAINED") {
    // DEC-005: required headcount is sized on BASE capacity, so an unproven AI
    // multiplier never reduces the committed team (and the AI benefit isn't double
    // counted against the AI cost MIN rule). AI still shortens the ELAPSED duration below.
    const required = calculateRequiredResources({
      devSP: input.devSP,
      qaSP: input.qaSP,
      targetSprints: input.targetSprints,
      devCapacity: input.baseDevCapacity,
      qaCapacity: input.baseQaCapacity,
    });
    const duration = calculateRequiredSprints({
      devSP: input.devSP,
      qaSP: input.qaSP,
      devResources: required.requiredDev,
      qaResources: required.requiredQa,
      devCapacity: input.aiDevCapacity,
      qaCapacity: input.aiQaCapacity,
    });
    return {
      plannedDev: required.requiredDev,
      plannedQa: required.requiredQa,
      requiredDev: required.requiredDev,
      requiredQa: required.requiredQa,
      ...duration,
      calculatedSprints: duration.finalSprints,
      explanation: {
        title: "Planning (Sprint-Constrained)",
        summary: `${required.requiredDev} Dev, ${required.requiredQa} QA over ${input.targetSprints} target sprint(s)`,
        steps: [...required.explanation.steps, ...duration.explanation.steps],
      },
    };
  }

  const duration = calculateRequiredSprints({
    devSP: input.devSP,
    qaSP: input.qaSP,
    devResources: input.availableDev,
    qaResources: input.availableQa,
    devCapacity: input.aiDevCapacity,
    qaCapacity: input.aiQaCapacity,
  });
  return {
    plannedDev: input.availableDev,
    plannedQa: input.availableQa,
    requiredDev: input.availableDev,
    requiredQa: input.availableQa,
    ...duration,
    calculatedSprints: duration.finalSprints,
    explanation: duration.explanation,
  };
}
