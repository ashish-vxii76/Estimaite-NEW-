"use client";

import { useState } from "react";
import { DEFAULT_CONFIG } from "@/domain/estimation/defaultConfig";
import type { EstimateCalculationInput } from "@/domain/estimation/types";

export function WhatIfForm({
  teams,
}: {
  teams: {
    teamId: string;
    teamName: string;
    availableLevels: string[];
    maxDev: number;
    maxQa: number;
  }[];
}) {
  const [teamId, setTeamId] = useState(teams[0]?.teamId ?? "");
  const [objective, setObjective] = useState("LOWEST_COST");
  const [maxSprints, setMaxSprints] = useState(3);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState("");

  const base: EstimateCalculationInput = {
    workItemType: "ISSUE",
    complexityScores: DEFAULT_CONFIG.complexityDimensions.map((d) => ({
      dimensionId: d.id,
      score: 3,
    })),
    readiness: ["business", "acceptance", "dependencies", "architecture", "test"].map(
      (criterionId) => ({ criterionId, answer: "YES" as const }),
    ),
    stance: "NEUTRAL",
    devResourceLevelId: "intermediate",
    qaResourceLevelId: "experienced",
    devAiProductivityPct: 0,
    qaAiProductivityPct: 0,
    planningMode: "RESOURCE_CONSTRAINED",
    availableDev: 1,
    availableQa: 1,
    targetSprints: 2,
    costingModel: "RESOURCE_SPRINT",
    resourceSprintRate: 4000,
    teamSprintRate: 12000,
    otherFixedCost: 0,
    locationAllocations: [
      {
        locationId: "uk",
        locationName: "United Kingdom",
        allocationPct: 100,
        dailyRate: 650,
        currency: "CHF",
      },
    ],
    currency: "CHF",
  };

  async function run() {
    setError("");
    const team = teams.find((t) => t.teamId === teamId);
    if (!team) return;
    const res = await fetch("/api/what-if", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ base, team, objective, maxSprints }),
    });
    const data = await res.json();
    if (!res.ok) setError(data.error ?? "Failed");
    else setResult(data.result);
  }

  return (
    <div className="card space-y-4 p-5">
      <div className="grid gap-3 md:grid-cols-3">
        <label className="text-sm">
          Team
          <select
            className="mt-1 w-full rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-3 py-2"
            value={teamId}
            onChange={(e) => setTeamId(e.target.value)}
          >
            {teams.map((t) => (
              <option key={t.teamId} value={t.teamId}>
                {t.teamName}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Objective
          <select
            className="mt-1 w-full rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-3 py-2"
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
          >
            <option value="LOWEST_COST">Lowest cost</option>
            <option value="FEWEST_SPRINTS">Fewest sprints</option>
            <option value="LEAST_EFFORT">Least effort</option>
            <option value="BEST_VALUE">Best value (fastest + 1 sprint slack, then cheapest)</option>
            <option value="CHEAPEST_WITHIN_N_SPRINTS">Cheapest within N sprints</option>
          </select>
        </label>
        <label className="text-sm">
          N sprints
          <input
            type="number"
            min={1}
            value={maxSprints}
            onChange={(e) => setMaxSprints(Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-3 py-2"
          />
        </label>
      </div>
      <button className="btn-primary" onClick={run}>
        Run scenario
      </button>
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      {result ? (
        <pre className="overflow-auto rounded-lg bg-[var(--panel-2)] p-4 text-xs">
          {JSON.stringify(result, null, 2)}
        </pre>
      ) : null}
    </div>
  );
}
