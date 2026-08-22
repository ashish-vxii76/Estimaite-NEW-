"use client";

import { useState } from "react";
import { DEFAULT_CONFIG } from "@/domain/estimation/defaultConfig";
import type { EstimateCalculationInput } from "@/domain/estimation/types";
import { formatMoney } from "@/lib/utils";
import type { ScenarioTeam } from "@/lib/scenarioTeams";

export type { ScenarioTeam } from "@/lib/scenarioTeams";

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

const FALLBACK_BASE: EstimateCalculationInput = {
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

export function WhatIfForm({
  teams,
  base,
  lockedTeamId,
  mode = "standalone",
}: {
  teams: ScenarioTeam[];
  /** When set, scenarios run against this governed estimate input (sandbox only). */
  base?: EstimateCalculationInput;
  /** Force the team selector to this team (estimate context). */
  lockedTeamId?: string;
  mode?: "standalone" | "estimate";
}) {
  const initialTeam = lockedTeamId || teams[0]?.teamId || "";
  const [teamId, setTeamId] = useState(initialTeam);
  const [objective, setObjective] = useState("LOWEST_COST");
  const [maxSprints, setMaxSprints] = useState(3);
  const [result, setResult] = useState<WhatIfResult | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const effectiveTeamId = lockedTeamId || teamId;
  const selectedTeam = teams.find((t) => t.teamId === effectiveTeamId);
  const usingEstimateBase = Boolean(base);

  async function run() {
    setError("");
    setBusy(true);
    try {
      const team = teams.find((t) => t.teamId === effectiveTeamId);
      if (!team) {
        setError("Select a team with roster capacity");
        return;
      }
      const res = await fetch("/api/what-if", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          base: base ?? FALLBACK_BASE,
          team,
          objective,
          maxSprints,
        }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Failed");
      else setResult(data.result);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={mode === "estimate" ? "space-y-4" : "card space-y-4 p-5"}>
      {mode === "estimate" ? (
        <p className="rounded-lg border border-dashed border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--muted)]">
          Sandbox only — runs against this CR&apos;s governed inputs. It never updates SP, cost or
          status. Use it to challenge staffing before review or approval.
        </p>
      ) : (
        <p className="text-sm text-[var(--muted)]">
          Team-level sandbox with a generic base estimate. Prefer the Scenarios tab on a submitted
          estimate for CR-specific analysis.
        </p>
      )}
      <div className="grid gap-3 md:grid-cols-3">
        <label className="text-sm">
          Team
          <select
            className="mt-1 w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2"
            value={effectiveTeamId}
            disabled={Boolean(lockedTeamId)}
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
          {usingEstimateBase ? " · base = this estimate" : " · base = generic defaults"}
        </p>
      ) : null}
      <button className="btn-primary" type="button" onClick={run} disabled={busy || !selectedTeam}>
        {busy ? "Running…" : "Run scenario"}
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
