import { round2 } from "./math";
import type {
  CostingBasis,
  EstimationConfig,
  Explanation,
  LocationAllocation,
  LocationDailyRateConfig,
  RosterMember,
} from "./types";

const COSTED_ROLES = new Set(["DEV", "QA", "Dev", "QA Engineer"]);

export function blendedDailyRateFromRoster(
  roster: RosterMember[],
  locationDailyRates: LocationDailyRateConfig[],
): { rate: number; explanation: Explanation } {
  const costed = roster.filter((r) => COSTED_ROLES.has(r.roleStream) || r.roleStream === "QA");
  const total = costed.reduce((s, r) => s + (r.headcount ?? 1), 0);
  if (total <= 0) {
    return {
      rate: 0,
      explanation: {
        title: "Blended Daily Rate",
        summary: "0",
        steps: ["No costed Dev/QA headcount on roster; blended rate is 0."],
      },
    };
  }
  const rateByLocation = Object.fromEntries(
    locationDailyRates.map((row) => [row.location, row.dailyRate]),
  );
  const weighted = costed.reduce((s, r) => {
    const rate = rateByLocation[r.location] ?? 0;
    return s + (r.headcount ?? 1) * rate;
  }, 0);
  const rate = round2(weighted / total);
  return {
    rate,
    explanation: {
      title: "Blended Daily Rate",
      summary: `${rate}`,
      steps: [
        "SM, PO, and IT Lead are not costed.",
        ...costed.map(
          (r) =>
            `${r.roleStream} ${r.location} × ${r.headcount ?? 1} × ${rateByLocation[r.location] ?? 0}`,
        ),
        `Blended Daily Rate = ${weighted} / ${total} = ${rate}`,
      ],
    },
  };
}

export function blendedDailyRate(allocations: LocationAllocation[]): {
  rate: number;
  explanation: Explanation;
} {
  const total = allocations.reduce((sum, a) => sum + a.allocationPct, 0);
  if (allocations.length === 0 || total === 0) {
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
          (a) =>
            `${a.locationName}: ${a.allocationPct}% × ${a.dailyRate} = ${round2((a.allocationPct / 100) * a.dailyRate)}`,
        ),
        `Blended Daily Rate = ${rate}`,
      ],
    },
  };
}

export function resolveSprintRates(input: {
  costingBasis?: CostingBasis | "";
  teamName?: string;
  locationName?: string;
  resourceSprintRate?: number;
  teamSprintRate?: number;
  config: EstimationConfig;
}): { teamSprintRate: number; resourceSprintRate: number } {
  if (input.costingBasis === "LOCATION" && input.locationName) {
    const loc = input.config.costMappings.find((r) => r.location === input.locationName);
    if (loc) {
      return {
        teamSprintRate: loc.teamSprintCost,
        resourceSprintRate: loc.resourceSprintCost,
      };
    }
  }
  if (input.teamName) {
    const team = input.config.teamCostMappings.find((r) => r.teamName === input.teamName);
    if (team) {
      return {
        teamSprintRate: team.teamSprintCost,
        resourceSprintRate: team.resourceSprintCost,
      };
    }
  }
  return {
    teamSprintRate: input.teamSprintRate ?? 0,
    resourceSprintRate: input.resourceSprintRate ?? 0,
  };
}

export function calculateCommercialCost(input: {
  plannedDev: number;
  plannedQa: number;
  sprints: number;
  selectedRate: number;
  otherFixedCost: number;
}): { deliveryCost: number; resourceSprints: number; explanation: Explanation } {
  if (input.selectedRate < 0 || input.otherFixedCost < 0) {
    throw new Error("Rates cannot be negative");
  }
  const plannedResources = input.plannedDev + input.plannedQa;
  const resourceSprints = round2(plannedResources * input.sprints);
  const deliveryCost = round2(resourceSprints * input.selectedRate + input.otherFixedCost);
  return {
    deliveryCost,
    resourceSprints,
    explanation: {
      title: "Resource Cost per Sprint",
      summary: `${deliveryCost}`,
      steps: [
        `Planned resources = ${input.plannedDev} Dev + ${input.plannedQa} QA = ${plannedResources}`,
        `Resource-Sprints = ${plannedResources} × ${input.sprints} = ${resourceSprints}`,
        `Delivery Cost = ${resourceSprints} × ${input.selectedRate} + other ${input.otherFixedCost} = ${deliveryCost}`,
      ],
    },
  };
}
