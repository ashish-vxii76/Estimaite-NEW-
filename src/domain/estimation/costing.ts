import { round2 } from "./math";
import type { CostingModel, Explanation, LocationAllocation } from "./types";

export function blendedDailyRate(allocations: LocationAllocation[]): {
  rate: number;
  explanation: Explanation;
} {
  const total = round2(allocations.reduce((sum, a) => sum + a.allocationPct, 0));
  if (allocations.length === 0) {
    return {
      rate: 0,
      explanation: {
        title: "Blended Daily Rate",
        summary: "No location mix supplied",
        steps: ["Blended rate is 0 when no locations are allocated."],
      },
    };
  }
  if (Math.abs(total - 100) > 0.01) {
    throw new Error("Team/location allocations must total 100%");
  }
  for (const a of allocations) {
    if (a.dailyRate < 0) throw new Error("Rates cannot be negative");
  }
  const rate = round2(
    allocations.reduce((sum, a) => sum + (a.allocationPct / 100) * a.dailyRate, 0),
  );
  return {
    rate,
    explanation: {
      title: "Blended Daily Rate",
      summary: `${rate}`,
      steps: [
        ...allocations.map(
          (a) => `${a.locationName}: ${a.allocationPct}% × ${a.dailyRate} = ${round2((a.allocationPct / 100) * a.dailyRate)}`,
        ),
        `Blended Daily Rate = ${rate}`,
      ],
    },
  };
}

export function calculateCommercialCost(input: {
  model: CostingModel;
  plannedDev: number;
  plannedQa: number;
  sprints: number;
  resourceSprintRate: number;
  teamSprintRate: number;
  otherFixedCost: number;
}): { deliveryCost: number; resourceSprints: number; explanation: Explanation } {
  if (input.resourceSprintRate < 0 || input.teamSprintRate < 0 || input.otherFixedCost < 0) {
    throw new Error("Rates cannot be negative");
  }
  const plannedResources = input.plannedDev + input.plannedQa;
  const resourceSprints = round2(plannedResources * input.sprints);

  if (input.model === "TEAM_SPRINT") {
    const deliveryCost = round2(input.sprints * input.teamSprintRate + input.otherFixedCost);
    return {
      deliveryCost,
      resourceSprints,
      explanation: {
        title: "Team Cost per Sprint",
        summary: `${deliveryCost}`,
        steps: [
          "Full-team sprint rate is not automatically prorated.",
          `Delivery Cost = ${input.sprints} sprints × ${input.teamSprintRate} + other ${input.otherFixedCost} = ${deliveryCost}`,
        ],
      },
    };
  }

  const deliveryCost = round2(resourceSprints * input.resourceSprintRate + input.otherFixedCost);
  return {
    deliveryCost,
    resourceSprints,
    explanation: {
      title: "Resource Cost per Sprint",
      summary: `${deliveryCost}`,
      steps: [
        `Planned resources = ${input.plannedDev} Dev + ${input.plannedQa} QA = ${plannedResources}`,
        `Resource-Sprints = ${plannedResources} × ${input.sprints} = ${resourceSprints}`,
        `Delivery Cost = ${resourceSprints} × ${input.resourceSprintRate} + other ${input.otherFixedCost} = ${deliveryCost}`,
      ],
    },
  };
}
