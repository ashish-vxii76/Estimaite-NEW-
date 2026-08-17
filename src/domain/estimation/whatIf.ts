import type { EstimationConfig, EstimateCalculationInput, ResourceLevelConfig } from "./types";
import { calculateEstimate } from "./calculate";

export type WhatIfObjective =
  | "LOWEST_COST"
  | "FEWEST_SPRINTS"
  | "FASTEST_DELIVERY"
  | "LEAST_EFFORT"
  | "BEST_VALUE"
  | "CHEAPEST_WITHIN_N_SPRINTS";

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
}): WhatIfResult {
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

  const candidates: ReturnType<typeof scoreCandidate>[] = [];
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
          candidates.push(candidate);
        }
      }
    }
  }

  let pool = candidates;
  if (input.objective === "BEST_VALUE" && pool.length) {
    const fastest = Math.min(...pool.map((c) => c.sprints));
    pool = pool.filter((c) => c.sprints <= fastest + 1);
  }

  let best: ReturnType<typeof scoreCandidate> | null = null;
  for (const candidate of pool) {
    if (!best || better(candidate, best, input.objective)) {
      best = candidate;
    }
  }

  if (!best) {
    const emptyNotes = [...notes, "No feasible combination within the deadline."];
    return {
      teamName: input.team.teamName,
      objective: input.objective,
      bestDevLevel: "",
      bestQaLevel: "",
      devCount: 0,
      qaCount: 0,
      sprints: 0,
      cost: 0,
      effort: 0,
      feasible: false,
      combinationsTried: candidates.length,
      notes: emptyNotes,
      rationale: explainWhatIf({
        feasible: false,
        objective: input.objective,
        maxSprints: input.maxSprints,
        teamName: input.team.teamName,
        combinationsTried: candidates.length,
        notes: emptyNotes,
      }),
    };
  }

  return {
    teamName: input.team.teamName,
    objective: input.objective,
    bestDevLevel: best.devLevel,
    bestQaLevel: best.qaLevel,
    devCount: best.devCount,
    qaCount: best.qaCount,
    sprints: best.sprints,
    cost: best.cost,
    effort: best.effort,
    feasible: true,
    combinationsTried: candidates.length,
    notes,
    rationale: explainWhatIf({
      feasible: true,
      objective: input.objective,
      maxSprints: input.maxSprints,
      teamName: input.team.teamName,
      combinationsTried: candidates.length,
      notes,
      best,
    }),
  };
}

export type WhatIfResult = {
  teamName: string;
  objective: WhatIfObjective;
  bestDevLevel: string;
  bestQaLevel: string;
  devCount: number;
  qaCount: number;
  sprints: number;
  cost: number | null;
  effort: number;
  feasible: boolean;
  combinationsTried: number;
  notes: string[];
  rationale: { title: string; summary: string; steps: string[] };
};

function explainWhatIf(input: {
  feasible: boolean;
  objective: WhatIfObjective;
  maxSprints?: number;
  teamName: string;
  combinationsTried: number;
  notes: string[];
  best?: ReturnType<typeof scoreCandidate>;
}): { title: string; summary: string; steps: string[] } {
  const goal = objectiveLabel(input.objective, input.maxSprints);
  if (!input.feasible || !input.best) {
    return {
      title: "Why this result",
      summary: `No mix for ${input.teamName} meets ${goal}.`,
      steps: [
        `The engine tried ${input.combinationsTried} Dev/QA seniority and headcount combinations on this team's roster.`,
        input.objective === "CHEAPEST_WITHIN_N_SPRINTS"
          ? `Every combination needed more than ${input.maxSprints} sprint(s).`
          : "No combination produced a governed delivery plan.",
        ...input.notes,
      ],
    };
  }
  const best = input.best;
  const costText = best.cost == null ? "cost deferred" : `${best.cost} CHF AI-adjusted`;
  return {
    title: "Why this result",
    summary: `${best.devCount} ${best.devLevel} Dev + ${best.qaCount} ${best.qaLevel} QA is the ${goal} mix for ${input.teamName}.`,
    steps: [
      `Objective: ${goal}. Scenarios never change an approved estimate; they only search staffing mixes.`,
      `Compared ${input.combinationsTried} combinations from this team's configured seniority and max Dev/QA headcount.`,
      `Winner: ${best.devCount} ${best.devLevel} Dev and ${best.qaCount} ${best.qaLevel} QA.`,
      `That mix plans ${best.sprints} sprint(s), ${best.effort} person-days, and ${costText}.`,
      explainRule(input.objective, input.maxSprints),
      "Seniority is limited to levels on the team's composition. Senior is skipped when the team has none configured.",
      ...input.notes,
    ],
  };
}

function objectiveLabel(objective: WhatIfObjective, maxSprints?: number) {
  switch (objective) {
    case "FEWEST_SPRINTS":
    case "FASTEST_DELIVERY":
      return "fewest sprints";
    case "LEAST_EFFORT":
      return "least effort";
    case "BEST_VALUE":
      return "best value (fastest plus one sprint of slack, then cheapest)";
    case "CHEAPEST_WITHIN_N_SPRINTS":
      return `cheapest mix within ${maxSprints ?? "N"} sprint(s)`;
    default:
      return "lowest AI-adjusted cost";
  }
}

function explainRule(objective: WhatIfObjective, maxSprints?: number) {
  switch (objective) {
    case "FEWEST_SPRINTS":
    case "FASTEST_DELIVERY":
      return "Tie-break: fewer sprints first, then lower cost, then lower effort.";
    case "LEAST_EFFORT":
      return "Tie-break: lower total person-days first, then lower cost.";
    case "BEST_VALUE":
      return "The pool is first cut to mixes within one sprint of the fastest, then the cheapest of those wins.";
    case "CHEAPEST_WITHIN_N_SPRINTS":
      return `Mixes slower than ${maxSprints ?? "N"} sprint(s) were discarded before choosing the cheapest remaining.`;
    default:
      return "Tie-break: lower AI-adjusted delivery cost first, then fewer sprints.";
  }
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

function costOf(c: { cost: number | null }) {
  return c.cost ?? Number.POSITIVE_INFINITY;
}

function better(
  a: ReturnType<typeof scoreCandidate>,
  b: ReturnType<typeof scoreCandidate>,
  objective: WhatIfObjective,
) {
  if (objective === "FASTEST_DELIVERY" || objective === "FEWEST_SPRINTS" || objective === "BEST_VALUE") {
    if (a.sprints !== b.sprints) return a.sprints < b.sprints;
    if (costOf(a) !== costOf(b)) return costOf(a) < costOf(b);
    return a.effort < b.effort;
  }
  if (objective === "LEAST_EFFORT") {
    if (a.effort !== b.effort) return a.effort < b.effort;
    return costOf(a) < costOf(b);
  }
  if (costOf(a) !== costOf(b)) return costOf(a) < costOf(b);
  return a.sprints < b.sprints;
}
