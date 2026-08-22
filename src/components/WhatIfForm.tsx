"use client";

import { useMemo, useState } from "react";
import { DEFAULT_CONFIG } from "@/domain/estimation/defaultConfig";
import type { EstimateCalculationInput } from "@/domain/estimation/types";
import { formatMoney } from "@/lib/utils";
import type { ScenarioTeam } from "@/lib/scenarioTeams";

export type { ScenarioTeam } from "@/lib/scenarioTeams";

type WhatIfResult = {
  teamId?: string;
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
  locationBlend?: string;
};

type ScenarioPayload = {
  selected: WhatIfResult;
  byTeam: WhatIfResult[];
  recommended: WhatIfResult | null;
};

const OBJECTIVES: { value: string; label: string }[] = [
  { value: "LOWEST_COST", label: "Lowest cost" },
  { value: "FEWEST_SPRINTS", label: "Fewest sprints" },
  { value: "LEAST_EFFORT", label: "Least effort" },
  { value: "BEST_VALUE", label: "Best value" },
  { value: "CHEAPEST_WITHIN_N_SPRINTS", label: "Cheapest within N sprints" },
];

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
  defaultTeamId,
  owningTeamId,
  mode = "standalone",
}: {
  teams: ScenarioTeam[];
  /** When set, scenarios run against this governed estimate input (sandbox only). */
  base?: EstimateCalculationInput;
  /** Default selected team (CR owner on estimate tab). */
  defaultTeamId?: string;
  /** CR owning team — shown in sensitivity copy. */
  owningTeamId?: string;
  mode?: "standalone" | "estimate";
}) {
  const initialTeam = defaultTeamId || owningTeamId || teams[0]?.teamId || "";
  const [teamId, setTeamId] = useState(initialTeam);
  const [objective, setObjective] = useState("LOWEST_COST");
  const [maxSprints, setMaxSprints] = useState(3);
  const [scenario, setScenario] = useState<ScenarioPayload | null>(null);
  const [standaloneResult, setStandaloneResult] = useState<WhatIfResult | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const deadlineEnabled = objective === "CHEAPEST_WITHIN_N_SPRINTS";
  const selectedTeam = teams.find((t) => t.teamId === teamId);
  const usingEstimateBase = Boolean(base);
  const owningName =
    teams.find((t) => t.teamId === (owningTeamId || defaultTeamId))?.teamName ?? "owning team";

  const objectiveLabel = useMemo(
    () => OBJECTIVES.find((o) => o.value === objective)?.label ?? objective,
    [objective],
  );

  async function run() {
    setError("");
    setBusy(true);
    setScenario(null);
    setStandaloneResult(null);
    try {
      if (!selectedTeam) {
        setError("Select a team with roster capacity");
        return;
      }
      if (mode === "estimate") {
        const res = await fetch("/api/what-if", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            base: base ?? FALLBACK_BASE,
            teams,
            selectedTeamId: teamId,
            objective,
            maxSprints: deadlineEnabled ? maxSprints : undefined,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Failed");
          return;
        }
        setScenario(data.scenario as ScenarioPayload);
      } else {
        const res = await fetch("/api/what-if", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            base: base ?? FALLBACK_BASE,
            team: selectedTeam,
            objective,
            maxSprints: deadlineEnabled ? maxSprints : undefined,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Failed");
          return;
        }
        setStandaloneResult(data.result as WhatIfResult);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={mode === "estimate" ? "space-y-5" : "card space-y-4 p-5"}>
      {mode === "estimate" ? (
        <p className="text-sm text-[var(--muted)]">
          Optimise for a goal; the tool fixes seniority and headcount within each team&apos;s
          composition. Deadline is used only by &ldquo;Cheapest within N sprints&rdquo;. Sandbox
          only — the CR stays with {owningName}.
        </p>
      ) : (
        <p className="text-sm text-[var(--muted)]">
          Team-level sandbox with a generic base estimate. Prefer the Scenarios tab on a submitted
          estimate for CR-specific analysis.
        </p>
      )}

      <div className="grid gap-3 md:grid-cols-3">
        <label className="text-sm">
          Optimise for
          <select
            className="mt-1 w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2"
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
          >
            {OBJECTIVES.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className={`text-sm ${deadlineEnabled ? "" : "opacity-50"}`}>
          Deadline (# sprints)
          <input
            type="number"
            min={1}
            value={maxSprints}
            disabled={!deadlineEnabled}
            onChange={(e) => setMaxSprints(Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2 disabled:cursor-not-allowed disabled:bg-[var(--bg)]"
          />
        </label>
        <label className="text-sm">
          Selected team
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
      </div>

      {selectedTeam ? (
        <p className="text-xs text-[var(--muted)]">
          Roster: max {selectedTeam.maxDev} Dev / {selectedTeam.maxQa} QA · levels{" "}
          {selectedTeam.availableLevels.join(", ") || "none"} · blend{" "}
          {selectedTeam.locationBlendLabel}
          {usingEstimateBase ? " · base = this CR" : " · base = generic defaults"}
        </p>
      ) : null}

      <button className="btn-primary" type="button" onClick={run} disabled={busy || !selectedTeam}>
        {busy ? "Running…" : "Run scenario"}
      </button>
      {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}

      {mode === "estimate" && scenario ? (
        <ScenarioOutcome
          scenario={scenario}
          objectiveLabel={objectiveLabel}
          owningTeamName={owningName}
          currency={base?.currency ?? selectedTeam?.currency ?? "CHF"}
        />
      ) : null}
      {mode === "standalone" && standaloneResult ? (
        <StandaloneOutcome result={standaloneResult} objectiveLabel={objectiveLabel} />
      ) : null}
    </div>
  );
}

function ScenarioOutcome({
  scenario,
  objectiveLabel,
  owningTeamName,
  currency,
}: {
  scenario: ScenarioPayload;
  objectiveLabel: string;
  owningTeamName: string;
  currency: string;
}) {
  const selected = scenario.selected;
  const recommended = scenario.recommended;

  return (
    <div className="space-y-6 border-t border-[var(--line)] pt-5">
      <section className="space-y-3">
        <div>
          <p className="kicker">1 · Selected team</p>
          <h3 className="font-display text-lg font-semibold text-[var(--navy)]">
            Recommended for {selected.teamName}
          </h3>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Best mix on the selected team for {objectiveLabel}.
          </p>
        </div>
        {selected.feasible ? (
          <MixGrid result={selected} currency={currency} />
        ) : (
          <p className="text-sm text-[var(--warn)]">
            No feasible mix for {selected.teamName}
            {selected.notes[0] ? ` — ${selected.notes[0]}` : "."}
          </p>
        )}
      </section>

      <section className="space-y-3">
        <div>
          <p className="kicker">2 · Comparison</p>
          <h3 className="font-display text-lg font-semibold text-[var(--navy)]">
            Best team for this CR
          </h3>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Each team&apos;s own best combo for the objective (roster + that team&apos;s rates).
          </p>
        </div>
        <div className="overflow-x-auto rounded-xl border border-[var(--line)]">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-[var(--panel-2)] text-xs uppercase tracking-wide text-[var(--muted)]">
              <tr>
                <th className="px-3 py-2 font-medium">Team</th>
                <th className="px-3 py-2 font-medium">Best Dev</th>
                <th className="px-3 py-2 font-medium">Best QA</th>
                <th className="px-3 py-2 font-medium">Dev#</th>
                <th className="px-3 py-2 font-medium">QA#</th>
                <th className="px-3 py-2 font-medium">Sprints</th>
                <th className="px-3 py-2 font-medium">Cost</th>
                <th className="px-3 py-2 font-medium">Effort (PD)</th>
                <th className="px-3 py-2 font-medium">Location blend</th>
              </tr>
            </thead>
            <tbody>
              {scenario.byTeam.map((row) => {
                const isRec = recommended?.teamId === row.teamId && row.feasible;
                return (
                  <tr
                    key={row.teamId ?? row.teamName}
                    className={`border-t border-[var(--line)] ${isRec ? "bg-emerald-50/70" : ""}`}
                  >
                    <td className="px-3 py-2 font-semibold text-[var(--navy)]">
                      {row.teamName}
                      {isRec ? (
                        <span className="ml-2 text-xs font-medium text-emerald-700">best</span>
                      ) : null}
                    </td>
                    {row.feasible ? (
                      <>
                        <td className="px-3 py-2 text-[var(--navy)]">{row.bestDevLevel}</td>
                        <td className="px-3 py-2 text-[var(--navy)]">{row.bestQaLevel}</td>
                        <td className="px-3 py-2 text-[var(--navy)]">{row.devCount}</td>
                        <td className="px-3 py-2 text-[var(--navy)]">{row.qaCount}</td>
                        <td className="px-3 py-2 font-semibold text-[var(--navy)]">{row.sprints}</td>
                        <td className="px-3 py-2 font-semibold text-[var(--navy)]">
                          {formatMoney(row.cost, currency)}
                        </td>
                        <td className="px-3 py-2 text-[var(--navy)]">{row.effort}</td>
                        <td className="px-3 py-2 text-[var(--muted)]">
                          {row.locationBlend ?? "—"}
                        </td>
                      </>
                    ) : (
                      <td className="px-3 py-2 text-[var(--warn)]" colSpan={8}>
                        No feasible mix
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-[var(--line)] bg-[var(--panel-2)] p-4">
        <p className="kicker">3 · Sandbox recommendation</p>
        <h3 className="font-display text-xl font-semibold text-[var(--navy)]">
          {recommended?.feasible
            ? `Recommended team: ${recommended.teamName}`
            : "No recommended team"}
        </h3>
        {recommended?.feasible ? (
          <p className="mt-2 text-sm text-[var(--navy)]">
            {recommended.devCount} {recommended.bestDevLevel} Dev + {recommended.qaCount}{" "}
            {recommended.bestQaLevel} QA · {recommended.sprints} sprint(s) ·{" "}
            {formatMoney(recommended.cost, currency)} · {recommended.effort} PD
          </p>
        ) : null}
        <p className="mt-2 text-xs text-[var(--muted)]">
          Sensitivity view — the CR stays with {owningTeamName}; this shows the trade if
          reassigned. Does not change the estimate.
        </p>
      </section>

      {selected.rationale ? (
        <section className="rounded-lg border border-[var(--line)] bg-white p-4">
          <p className="text-sm font-semibold text-[var(--navy)]">{selected.rationale.title}</p>
          <p className="mt-1 text-sm">{selected.rationale.summary}</p>
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-[var(--muted)]">
            {selected.rationale.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </section>
      ) : null}
    </div>
  );
}

function MixGrid({ result, currency }: { result: WhatIfResult; currency: string }) {
  return (
    <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Stat label="Dev level" value={result.bestDevLevel} />
      <Stat label="QA level" value={result.bestQaLevel} />
      <Stat label="Dev count" value={String(result.devCount)} />
      <Stat label="QA count" value={String(result.qaCount)} />
      <Stat label="Sprints" value={String(result.sprints)} />
      <Stat label="AI-adjusted cost" value={formatMoney(result.cost, currency)} />
      <Stat label="Effort (PD)" value={String(result.effort)} />
      <Stat label="Location blend" value={result.locationBlend ?? "—"} />
    </dl>
  );
}

function StandaloneOutcome({
  result,
  objectiveLabel,
}: {
  result: WhatIfResult;
  objectiveLabel: string;
}) {
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
          {objectiveLabel} · {result.teamName}
          {result.combinationsTried != null
            ? ` · ${result.combinationsTried} combinations compared`
            : ""}
        </p>
      </div>
      {result.feasible ? <MixGrid result={result} currency="CHF" /> : null}
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
