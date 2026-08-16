import type { EstimationConfig, EstimateCalculationInput, ResourceLevelConfig } from "./types";
import { calculateEstimate } from "./calculate";

export type WhatIfObjective = "LOWEST_COST" | "FASTEST_DELIVERY" | "CHEAPEST_WITHIN_N_SPRINTS";

export type TeamComposition = {
  teamId: string;
  teamName: string;
  availableLevels: string[];
  maxDev: number;
  maxQa: number;
};

export function runWhatIf(input: {
  base: EstimateCalculationInput;
  config: EstimationConfig;
  team: TeamComposition;
  objective: WhatIfObjective;
  maxSprints?: number;
}): {
  teamName: string;
  bestDevLevel: string;
  bestQaLevel: string;
  devCount: number;
  qaCount: number;
  sprints: number;
  cost: number;
  effort: number;
  feasible: boolean;
  notes: string[];
} {
  const notes: string[] = [];
  const levels = input.config.resourceLevels.filter((l) =>
    input.team.availableLevels.includes(l.id),
  );
  if (levels.length === 0) {
    throw new Error("Team has no configured seniority levels");
  }
  if (!input.team.availableLevels.includes("senior")) {
    notes.push("Senior is not recommended because this team has none configured.");
  }

  let best: ReturnType<typeof scoreCandidate> | null = null;
  for (const devLevel of levels) {
    for (const qaLevel of levels) {
      for (let devCount = 1; devCount <= input.team.maxDev; devCount += 1) {
        for (let qaCount = 1; qaCount <= input.team.maxQa; qaCount += 1) {
          const candidate = scoreCandidate(
            input.base,
            input.config,
            devLevel,
            qaLevel,
            devCount,
            qaCount,
          );
          if (
            input.objective === "CHEAPEST_WITHIN_N_SPRINTS" &&
            candidate.sprints > (input.maxSprints ?? Number.POSITIVE_INFINITY)
          ) {
            continue;
          }
          if (!best || better(candidate, best, input.objective)) {
            best = candidate;
          }
        }
      }
    }
  }

  if (!best) {
    return {
      teamName: input.team.teamName,
      bestDevLevel: "",
      bestQaLevel: "",
      devCount: 0,
      qaCount: 0,
      sprints: 0,
      cost: 0,
      effort: 0,
      feasible: false,
      notes: [...notes, "No feasible combination within the deadline."],
    };
  }

  return {
    teamName: input.team.teamName,
    bestDevLevel: best.devLevel,
    bestQaLevel: best.qaLevel,
    devCount: best.devCount,
    qaCount: best.qaCount,
    sprints: best.sprints,
    cost: best.cost,
    effort: best.effort,
    feasible: true,
    notes,
  };
}

function scoreCandidate(
  base: EstimateCalculationInput,
  config: EstimationConfig,
  devLevel: ResourceLevelConfig,
  qaLevel: ResourceLevelConfig,
  devCount: number,
  qaCount: number,
) {
  const result = calculateEstimate(
    {
      ...base,
      planningMode: "RESOURCE_CONSTRAINED",
      devResourceLevelId: devLevel.id,
      qaResourceLevelId: qaLevel.id,
      availableDev: devCount,
      availableQa: qaCount,
    },
    config,
  );
  return {
    devLevel: devLevel.name,
    qaLevel: qaLevel.name,
    devCount,
    qaCount,
    sprints: result.finalSprints,
    cost: result.aiAdjustedDeliveryCost,
    effort: result.adjustedTotalEffortPd,
  };
}

function better(
  a: ReturnType<typeof scoreCandidate>,
  b: ReturnType<typeof scoreCandidate>,
  objective: WhatIfObjective,
) {
  if (objective === "FASTEST_DELIVERY") {
    if (a.sprints !== b.sprints) return a.sprints < b.sprints;
    return a.cost < b.cost;
  }
  if (a.cost !== b.cost) return a.cost < b.cost;
  return a.sprints < b.sprints;
}
