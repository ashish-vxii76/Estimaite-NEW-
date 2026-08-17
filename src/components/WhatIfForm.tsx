"use client";

import { useState } from "react";
import { DEFAULT_CONFIG } from "@/domain/estimation/defaultConfig";
import type { EstimateCalculationInput } from "@/domain/estimation/types";
import { formatMoney } from "@/lib/utils";

type WhatIfResult = {
  teamName: string;
  objective?: string;
  bestDevLevel: string;
  bestQaLevel: string;
  devCount: number;
  qaCount: number;
  sprints: number;
  cost: number | null;
  effort: number;
  feasible: boolean;
  combinationsTried?: number;
  notes: string[];
  rationale?: { title: string; summary: string; steps: string[] };
};

const OBJECTIVES: Record<string, string> = {
  LOWEST_COST: "Lowest cost",
  FEWEST_SPRINTS: "Fewest sprints",
  FASTEST_DELIVERY: "Fastest delivery",
  LEAST_EFFORT: "Least effort",
  BEST_VALUE: "Best value (fastest + 1 sprint slack, then cheapest)",
  CHEAPEST_WITHIN_N_SPRINTS: "Cheapest within N sprints",
};

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
  const [result, setResult] = useState<WhatIfResult | null>(null);
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

  const selectedTeam = teams.find((t) => t.teamId === teamId);

  return (
    <div className="card space-y-4 p-5">
      <div className="grid gap-3 md:grid-cols-3">
        <label className="text-sm">
          Team
          <select
            className="mt-1 w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2"
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
            className="mt-1 w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2"
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
          >
            {Object.entries(OBJECTIVES).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          N sprints
          <input
            type="number"
            min={1}
            value={maxSprints}
            onChange={(e) => setMaxSprints(Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2"
          />
        </label>
      </div>
      {selectedTeam ? (
        <p className="text-xs text-[var(--muted)]">
          Roster: max {selectedTeam.maxDev} Dev / {selectedTeam.maxQa} QA · levels{" "}
          {selectedTeam.availableLevels.join(", ") || "none"}
        </p>
      ) : null}
      <button className="btn-primary" type="button" onClick={run}>
        Run scenario
      </button>
      {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
      {result ? <WhatIfOutcome result={result} objective={objective} /> : null}
    </div>
  );
}

function WhatIfOutcome({ result, objective }: { result: WhatIfResult; objective: string }) {
  return (
    <div className="space-y-4 border-t border-[var(--line)] pt-4">
      <div>
        <p className="kicker">Recommended mix</p>
        <h2 className="font-display text-xl font-semibold text-[var(--navy)]">
          {result.feasible
            ? `${result.devCount} ${result.bestDevLevel} Dev + ${result.qaCount} ${result.bestQaLevel} QA`
            : "No feasible mix"}
        </h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          {OBJECTIVES[result.objective ?? objective] ?? objective} · {result.teamName}
          {result.combinationsTried != null ? ` · ${result.combinationsTried} combinations compared` : ""}
        </p>
      </div>
      {result.feasible ? (
        <dl className="grid gap-3 sm:grid-cols-3">
          <Stat label="Sprints" value={String(result.sprints)} />
          <Stat label="AI-adjusted cost" value={formatMoney(result.cost, "CHF")} />
          <Stat label="Effort (PD)" value={String(result.effort)} />
        </dl>
      ) : null}
      {result.notes.length ? (
        <ul className="space-y-1 text-sm text-[var(--warn)]">
          {result.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      ) : null}
      {result.rationale ? (
        <section className="rounded-lg border border-[var(--line)] bg-[var(--panel-2)] p-4">
          <p className="text-sm font-semibold text-[var(--navy)]">{result.rationale.title}</p>
          <p className="mt-1 text-sm">{result.rationale.summary}</p>
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-[var(--muted)]">
            {result.rationale.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </section>
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 py-2">
      <dt className="text-xs uppercase tracking-wide text-[var(--muted)]">{label}</dt>
      <dd className="mt-1 text-lg font-semibold text-[var(--navy)]">{value}</dd>
    </div>
  );
}
