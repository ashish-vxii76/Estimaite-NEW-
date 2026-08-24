"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DEFAULT_CONFIG } from "@/domain/estimation/defaultConfig";
import type {
  EstimateCalculationInput,
  EstimateCalculationResult,
} from "@/domain/estimation/types";
import { formatMoney } from "@/lib/utils";
import type { ScenarioTeam } from "@/lib/scenarioTeams";
import { lockedOrgPathFromUnits, type LockedOrgPathView } from "@/lib/lockedOrgPath";

export type { ScenarioTeam } from "@/lib/scenarioTeams";

export type ScenarioAcceptPayload = {
  estimate: {
    teamId: string;
    availableDev: number;
    availableQa: number;
    devResourceLevel: string;
    qaResourceLevel: string;
    planningMode: string;
  };
  result: EstimateCalculationResult;
};

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
  /** How the current sandbox selected mix was chosen. */
  selectionSource?: "objective" | "manual";
};

export type SavedScenarioSnapshot = {
  savedAt: string;
  objective: string;
  maxSprints?: number | null;
  selectedTeamId: string;
  scenario: ScenarioPayload;
};

type MixRow = {
  bestDevLevel: string;
  bestQaLevel: string;
  devCount: number;
  qaCount: number;
  sprints: number;
  cost: number | null;
  effort: number;
};

function mixKey(row: {
  bestDevLevel: string;
  bestQaLevel: string;
  devCount: number;
  qaCount: number;
}) {
  return `${row.bestDevLevel}|${row.bestQaLevel}|${row.devCount}|${row.qaCount}`;
}

function sameMix(
  a: {
    bestDevLevel: string;
    bestQaLevel: string;
    devCount: number;
    qaCount: number;
  },
  b: {
    bestDevLevel: string;
    bestQaLevel: string;
    devCount: number;
    qaCount: number;
  },
) {
  return mixKey(a) === mixKey(b);
}

/** Client-side ranking aligned with what-if objectives (for sandbox recommended refresh). */
function betterSandbox(a: WhatIfResult, b: WhatIfResult, objective: string) {
  const costOf = (r: WhatIfResult) => r.cost ?? Number.POSITIVE_INFINITY;
  if (objective === "FEWEST_SPRINTS" || objective === "BEST_VALUE" || objective === "FASTEST_DELIVERY") {
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
  estimateId,
  estimateStatus = "DRAFT",
  initialSaved,
  canAccept = false,
  onSaved,
  onAccepted,
  mode = "standalone",
  orgUnits = [],
}: {
  teams: ScenarioTeam[];
  base?: EstimateCalculationInput;
  defaultTeamId?: string;
  owningTeamId?: string;
  estimateId?: string;
  estimateStatus?: string;
  initialSaved?: SavedScenarioSnapshot | null;
  canAccept?: boolean;
  onSaved?: (snapshot: SavedScenarioSnapshot) => void;
  onAccepted?: (payload: ScenarioAcceptPayload) => void;
  mode?: "standalone" | "estimate";
  /** Org tree for locked Company→Crew path on estimate Scenarios. */
  orgUnits?: { id: string; type: string; name: string; parentId: string | null }[];
}) {
  const router = useRouter();
  const lockedTeamId =
    mode === "estimate" ? owningTeamId || defaultTeamId || teams[0]?.teamId || "" : "";
  const [teamId, setTeamId] = useState(lockedTeamId || defaultTeamId || teams[0]?.teamId || "");
  const [objective, setObjective] = useState(initialSaved?.objective || "LOWEST_COST");
  const [maxSprints, setMaxSprints] = useState(
    initialSaved?.maxSprints != null ? Number(initialSaved.maxSprints) : 3,
  );
  /** Estimate mode: optional Pod narrow within the CR’s locked Crew. */
  const [podFilter, setPodFilter] = useState("");
  const [scenario, setScenario] = useState<ScenarioPayload | null>(
    initialSaved?.scenario ?? null,
  );
  const [standaloneResult, setStandaloneResult] = useState<WhatIfResult | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState(
    initialSaved?.savedAt
      ? `Loaded saved scenario from ${new Date(initialSaved.savedAt).toLocaleString()}`
      : "",
  );
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [dirty, setDirty] = useState(!initialSaved?.scenario);
  const [expandTeamId, setExpandTeamId] = useState("");
  const [allMixes, setAllMixes] = useState<MixRow[] | null>(null);
  const [mixesBusy, setMixesBusy] = useState(false);
  const [acceptSource, setAcceptSource] = useState<"selected" | "recommended">("selected");
  const [applyTeam, setApplyTeam] = useState(false);

  useEffect(() => {
    if (!initialSaved?.scenario) return;
    setScenario(initialSaved.scenario);
    setObjective(initialSaved.objective || "LOWEST_COST");
    if (initialSaved.maxSprints != null) setMaxSprints(Number(initialSaved.maxSprints));
    setDirty(false);
    setMessage((prev) =>
      prev.startsWith("Scenario saved") || prev.startsWith("Scenario accepted")
        ? prev
        : `Loaded saved scenario from ${new Date(initialSaved.savedAt).toLocaleString()}`,
    );
  }, [initialSaved]);

  const deadlineEnabled = objective === "CHEAPEST_WITHIN_N_SPRINTS";
  const teamLocked = mode === "estimate";
  const owningId = owningTeamId || defaultTeamId || lockedTeamId;
  const owningTeam = teams.find((t) => t.teamId === owningId);
  const lockedCrewId = owningTeam?.crewId ?? null;
  const lockedPath: LockedOrgPathView = useMemo(
    () => lockedOrgPathFromUnits(orgUnits, lockedCrewId),
    [orgUnits, lockedCrewId],
  );
  const crewPods = useMemo(() => {
    if (!lockedCrewId) return teams;
    return teams.filter((t) => t.crewId === lockedCrewId);
  }, [teams, lockedCrewId]);
  /**
   * Estimate: pods in the CR’s Crew (locked path); optional Pod filter.
   * Owner always stays. Standalone: teams already scoped by the page.
   */
  const scopedTeams = useMemo(() => {
    if (!teamLocked) return teams;
    const basePods = crewPods.length ? crewPods : teams;
    if (!podFilter) return basePods;
    return basePods.filter((t) => t.teamId === podFilter || t.teamId === owningId);
  }, [teamLocked, teams, crewPods, podFilter, owningId]);
  const effectiveTeamId = teamLocked ? lockedTeamId || teamId : teamId;
  const selectedTeam =
    scopedTeams.find((t) => t.teamId === effectiveTeamId) ??
    teams.find((t) => t.teamId === effectiveTeamId);
  const owningName = owningTeam?.teamName ?? "owning team";
  const canSave = mode === "estimate" && Boolean(estimateId) && Boolean(scenario);
  const acceptAllowed =
    canAccept &&
    mode === "estimate" &&
    Boolean(estimateId) &&
    Boolean(scenario) &&
    ["READY_FOR_REVIEW", "REVIEWED"].includes(estimateStatus);

  const objectiveLabel = useMemo(
    () => OBJECTIVES.find((o) => o.value === objective)?.label ?? objective,
    [objective],
  );

  const acceptMix =
    acceptSource === "recommended" ? scenario?.recommended : scenario?.selected;

  async function run() {
    setError("");
    setMessage("");
    setBusy(true);
    setAllMixes(null);
    setExpandTeamId("");
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
            teams: scopedTeams,
            selectedTeamId: effectiveTeamId,
            objective,
            maxSprints: deadlineEnabled ? maxSprints : undefined,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(typeof data.error === "string" ? data.error : "Failed");
          return;
        }
        setScenario({
          ...(data.scenario as ScenarioPayload),
          selectionSource: "objective",
        });
        setDirty(true);
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
          setError(typeof data.error === "string" ? data.error : "Failed");
          return;
        }
        setStandaloneResult(data.result as WhatIfResult);
      }
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (!estimateId || !scenario) return;
    setError("");
    setMessage("");
    setSaving(true);
    try {
      const res = await fetch(`/api/estimates/${estimateId}/scenario`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          objective,
          maxSprints: deadlineEnabled ? maxSprints : null,
          selectedTeamId: effectiveTeamId,
          scenario,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Save failed");
        return;
      }
      const snapshot = data.scenario as SavedScenarioSnapshot;
      setDirty(false);
      setMessage(
        `Scenario saved ${snapshot.savedAt ? new Date(snapshot.savedAt).toLocaleString() : ""}`.trim(),
      );
      onSaved?.(snapshot);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function loadMixes(teamIdToExpand: string) {
    if (!teamIdToExpand) {
      setExpandTeamId("");
      setAllMixes(null);
      return;
    }
    setMixesBusy(true);
    setError("");
    try {
      const res = await fetch("/api/what-if", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          base: base ?? FALLBACK_BASE,
          teams,
          selectedTeamId: effectiveTeamId,
          objective,
          maxSprints: deadlineEnabled ? maxSprints : undefined,
          expandTeamId: teamIdToExpand,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Failed to load mixes");
        return;
      }
      setExpandTeamId(teamIdToExpand);
      setAllMixes((data.allMixes as MixRow[]) ?? []);
    } finally {
      setMixesBusy(false);
    }
  }

  /** Sandbox only — rewrite selected/byTeam; does not touch the governed estimate. */
  function pickSandboxMix(teamIdForMix: string, mix: MixRow) {
    if (!scenario || mode !== "estimate") return;
    const team = teams.find((t) => t.teamId === teamIdForMix);
    if (!team) return;
    const baselineId = scenario.selected.teamId || owningTeamId || lockedTeamId;
    const prior = scenario.byTeam.find((r) => r.teamId === teamIdForMix);
    const nextRow: WhatIfResult = {
      teamId: teamIdForMix,
      teamName: team.teamName,
      objective,
      bestDevLevel: mix.bestDevLevel,
      bestQaLevel: mix.bestQaLevel,
      devCount: mix.devCount,
      qaCount: mix.qaCount,
      sprints: mix.sprints,
      cost: mix.cost,
      effort: mix.effort,
      feasible: true,
      combinationsTried: prior?.combinationsTried,
      locationBlend: prior?.locationBlend ?? team.locationBlendLabel,
      notes: [
        `Manual sandbox pick for ${objectiveLabel} (was not necessarily the objective-best mix).`,
      ],
      rationale: prior?.rationale,
    };
    const nextByTeam = scenario.byTeam.map((row) =>
      row.teamId === teamIdForMix ? nextRow : row,
    );
    let recommended: WhatIfResult | null = null;
    for (const row of nextByTeam) {
      if (!row.feasible) continue;
      if (!recommended || betterSandbox(row, recommended, objective)) {
        recommended = row;
      }
    }
    const nextSelected =
      baselineId && teamIdForMix === baselineId
        ? { ...nextRow, notes: [...nextRow.notes] }
        : scenario.selected;
    setScenario({
      selected: nextSelected,
      byTeam: nextByTeam,
      recommended,
      selectionSource: teamIdForMix === baselineId ? "manual" : scenario.selectionSource,
    });
    setDirty(true);
    setAcceptSource(teamIdForMix === baselineId ? "selected" : acceptSource);
    setMessage(
      teamIdForMix === baselineId
        ? `Sandbox selection updated to ${mix.devCount} ${mix.bestDevLevel} Dev + ${mix.qaCount} ${mix.bestQaLevel} QA on ${team.teamName}. Save to keep; Accept still required to change the governed estimate.`
        : `Sandbox mix for ${team.teamName} updated. Comparison / recommendation refreshed. Does not change the governed estimate.`,
    );
  }

  async function accept() {
    if (!estimateId || !acceptMix?.feasible || !acceptMix.teamId) return;
    const teamNote = applyTeam
      ? `\n\nAlso reassign this CR to ${acceptMix.teamName}.`
      : "\n\nCR team ownership will stay unchanged.";
    const ok = window.confirm(
      `Accept this scenario into the governed estimate?\n\n` +
        `${acceptMix.devCount} ${acceptMix.bestDevLevel} Dev + ${acceptMix.qaCount} ${acceptMix.bestQaLevel} QA` +
        `\nThis updates Plan & cost fields and recalculates SP/cost/sprints.` +
        teamNote,
    );
    if (!ok) return;
    setError("");
    setMessage("");
    setAccepting(true);
    try {
      const res = await fetch(`/api/estimates/${estimateId}/scenario/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: acceptSource,
          applyTeam,
          mix: {
            teamId: acceptMix.teamId,
            teamName: acceptMix.teamName,
            bestDevLevel: acceptMix.bestDevLevel,
            bestQaLevel: acceptMix.bestQaLevel,
            devCount: acceptMix.devCount,
            qaCount: acceptMix.qaCount,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Accept failed");
        return;
      }
      setMessage("Scenario accepted into the governed estimate. Audit trail updated.");
      if (data.estimate && data.result) {
        onAccepted?.({
          estimate: data.estimate,
          result: data.result as EstimateCalculationResult,
        });
      }
      router.refresh();
    } finally {
      setAccepting(false);
    }
  }

  return (
    <div className={mode === "estimate" ? "space-y-5" : "card space-y-4 p-5"}>
      {mode === "estimate" ? (
        <p className="text-sm text-[var(--muted)]">
          Pick an objective and run. Baseline team is this CR&apos;s owner ({owningName}). Company →
          Crew are locked from the CR; only Pod is open to narrow who competes in the cross-team
          table (owner always stays).
        </p>
      ) : (
        <p className="text-sm text-[var(--muted)]">
          Team-level sandbox with a generic base estimate. Prefer the Scenarios tab on a submitted
          estimate for CR-specific analysis.
        </p>
      )}

      {mode === "estimate" ? (
        <section className="space-y-3 rounded-xl border border-[var(--line)] bg-[var(--panel-2)] p-4">
          <p className="text-xs text-[var(--muted)]">
            Organisation path locked from this CR’s Pod. Only Pod / Team is open.
          </p>
          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
            {(
              [
                ["Company", lockedPath.companyName],
                ["Division", lockedPath.divisionName],
                ["Sub-Division", lockedPath.subDivisionName],
                ["Stream", lockedPath.streamName],
                ["Crew", lockedPath.crewName],
              ] as const
            ).map(([label, value]) => (
              <label key={label} className="text-sm">
                {label}
                <input
                  className="mt-1 w-full cursor-not-allowed rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-sm opacity-90"
                  value={value}
                  readOnly
                  tabIndex={-1}
                />
              </label>
            ))}
            <label className="text-sm">
              Pod / Team
              <select
                className="mt-1 w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2"
                value={podFilter}
                onChange={(e) => {
                  setPodFilter(e.target.value);
                  setDirty(true);
                  setScenario(null);
                  setAllMixes(null);
                  setExpandTeamId("");
                }}
              >
                <option value="">All pods in Crew</option>
                {crewPods.map((t) => (
                  <option key={t.teamId} value={t.teamId}>
                    {t.teamName}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>
      ) : null}

      <div className="grid gap-3 md:grid-cols-3">
        <label className="text-sm">
          Optimise for
          <select
            className="mt-1 w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2"
            value={objective}
            onChange={(e) => {
              setObjective(e.target.value);
              setDirty(true);
              setAllMixes(null);
              setExpandTeamId("");
            }}
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
            value={deadlineEnabled ? maxSprints : ""}
            placeholder="—"
            disabled={!deadlineEnabled}
            title={
              deadlineEnabled
                ? undefined
                : "Used only when Optimise for is Cheapest within N sprints"
            }
            onChange={(e) => {
              setMaxSprints(Number(e.target.value));
              setDirty(true);
            }}
            className="mt-1 w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2 disabled:cursor-not-allowed disabled:bg-[var(--bg)]"
          />
        </label>
        {teamLocked ? (
          <div className="text-sm">
            <p className="text-[var(--muted)]">CR team (baseline)</p>
            <p className="mt-1 rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 py-2 font-medium text-[var(--navy)]">
              {owningName}
              {lockedPath.crewName !== "All" ? ` · ${lockedPath.crewName}` : ""}
            </p>
          </div>
        ) : (
          <label className="text-sm">
            Selected team
            <select
              className="mt-1 w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2"
              value={effectiveTeamId}
              onChange={(e) => setTeamId(e.target.value)}
            >
              {scopedTeams.map((t) => (
                <option key={t.teamId} value={t.teamId}>
                  {t.teamName}
                  {t.crewName ? ` (${t.crewName})` : ""}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {selectedTeam ? (
        <p className="text-xs text-[var(--muted)]">
          Roster: max {selectedTeam.maxDev} Dev / {selectedTeam.maxQa} QA · levels{" "}
          {selectedTeam.availableLevels.join(", ") || "none"} · blend{" "}
          {selectedTeam.locationBlendLabel}
          {base ? " · base = this CR" : " · base = generic defaults"}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button className="btn-primary" type="button" onClick={run} disabled={busy || !selectedTeam}>
          {busy ? "Running…" : "Run scenario"}
        </button>
        {mode === "estimate" ? (
          <button
            className="btn-ghost"
            type="button"
            onClick={save}
            disabled={!canSave || saving || !dirty}
            title={
              !scenario
                ? "Run a scenario before saving"
                : !dirty
                  ? "Latest run is already saved"
                  : "Save sandbox snapshot on this CR"
            }
          >
            {saving ? "Saving…" : dirty ? "Save scenario" : "Saved"}
          </button>
        ) : null}
      </div>
      {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
      {message ? <p className="text-sm text-[var(--navy)]">{message}</p> : null}

      {mode === "estimate" && scenario ? (
        <>
          <ScenarioOutcome
            scenario={scenario}
            objectiveLabel={objectiveLabel}
            owningTeamName={owningName}
            currency={base?.currency ?? selectedTeam?.currency ?? "CHF"}
            teams={scopedTeams}
            expandTeamId={expandTeamId}
            allMixes={allMixes}
            mixesBusy={mixesBusy}
            onExpandTeam={loadMixes}
            canPickSandbox={mode === "estimate"}
            onPickSandboxMix={pickSandboxMix}
          />
          {acceptAllowed ? (
            <section className="space-y-3 rounded-xl border border-[var(--line)] bg-white p-4">
              <div>
                <p className="kicker">Accept into estimate</p>
                <h3 className="font-display text-lg font-semibold text-[var(--navy)]">
                  Promote staffing (review stage)
                </h3>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  Available while status is Ready for review or Reviewed. Recalculates the governed
                  pack and writes an audit event.
                </p>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="text-sm">
                  Apply mix from
                  <select
                    className="mt-1 w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2"
                    value={acceptSource}
                    onChange={(e) =>
                      setAcceptSource(e.target.value as "selected" | "recommended")
                    }
                  >
                    <option value="selected">
                      Baseline team best ({scenario.selected.teamName})
                    </option>
                    <option value="recommended" disabled={!scenario.recommended?.feasible}>
                      Recommended team
                      {scenario.recommended?.feasible
                        ? ` (${scenario.recommended.teamName})`
                        : " (none)"}
                    </option>
                  </select>
                </label>
                <label className="flex items-start gap-2 text-sm md:mt-6">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={applyTeam}
                    onChange={(e) => setApplyTeam(e.target.checked)}
                    disabled={
                      !acceptMix?.teamId || acceptMix.teamId === (owningTeamId || lockedTeamId)
                    }
                  />
                  <span>
                    Also reassign CR team to the mix&apos;s team
                    <span className="block text-xs text-[var(--muted)]">
                      Off by default — ownership stays with {owningName}.
                    </span>
                  </span>
                </label>
              </div>
              <button
                type="button"
                className="btn-primary"
                disabled={accepting || !acceptMix?.feasible}
                onClick={accept}
              >
                {accepting ? "Accepting…" : "Accept scenario"}
              </button>
            </section>
          ) : mode === "estimate" && scenario ? (
            <p className="text-xs text-[var(--muted)]">
              Accept is available during Ready for review / Reviewed when you can edit estimates.
            </p>
          ) : null}
        </>
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
  teams,
  expandTeamId,
  allMixes,
  mixesBusy,
  onExpandTeam,
  canPickSandbox,
  onPickSandboxMix,
}: {
  scenario: ScenarioPayload;
  objectiveLabel: string;
  owningTeamName: string;
  currency: string;
  teams: ScenarioTeam[];
  expandTeamId: string;
  allMixes: MixRow[] | null;
  mixesBusy: boolean;
  onExpandTeam: (teamId: string) => void;
  canPickSandbox: boolean;
  onPickSandboxMix: (teamId: string, mix: MixRow) => void;
}) {
  const selected = scenario.selected;
  const recommended = scenario.recommended;
  const expandName = teams.find((t) => t.teamId === expandTeamId)?.teamName;
  const sandboxForExpand = scenario.byTeam.find((r) => r.teamId === expandTeamId && r.feasible);
  const objectiveBestMix = allMixes && allMixes.length > 0 ? allMixes[0] : null;
  const manualBaseline = scenario.selectionSource === "manual";

  return (
    <div className="space-y-6 border-t border-[var(--line)] pt-5">
      <section className="space-y-3">
        <div>
          <p className="kicker">1 · Baseline team</p>
          <h3 className="font-display text-lg font-semibold text-[var(--navy)]">
            {manualBaseline ? "Sandbox selection for" : "Recommended for"} {selected.teamName}
          </h3>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {manualBaseline
              ? "Manual sandbox pick (may differ from objective-best). Still sandbox until Accept."
              : `Best mix on the CR baseline team for ${objectiveLabel}.`}
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
            Each team&apos;s own combo for the objective. Expand a team to audit mixes;{" "}
            <strong>Use this mix</strong> rewrites the sandbox only (not the governed estimate).
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

        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm">
            Show all mixes for
            <select
              className="mt-1 block min-w-[200px] rounded-lg border border-[var(--line)] bg-white px-3 py-2"
              value={expandTeamId}
              onChange={(e) => onExpandTeam(e.target.value)}
            >
              {expandTeamId ? (
                <option value="">Hide mixes</option>
              ) : (
                <option value="" disabled>
                  Select a team…
                </option>
              )}
              {teams.map((t) => (
                <option key={t.teamId} value={t.teamId}>
                  {t.teamName}
                </option>
              ))}
            </select>
          </label>
          {mixesBusy ? <p className="text-sm text-[var(--muted)]">Loading mixes…</p> : null}
        </div>

        {expandTeamId && allMixes ? (
          <div className="overflow-x-auto rounded-xl border border-dashed border-[var(--line)]">
            <p className="bg-[var(--panel-2)] px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
              All mixes · {expandName} · {allMixes.length} combinations
              {canPickSandbox
                ? " · green = objective-best · blue = sandbox · Use this mix = sandbox only"
                : ""}
            </p>
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-[var(--muted)]">
                <tr>
                  <th className="px-3 py-2 font-medium">Dev</th>
                  <th className="px-3 py-2 font-medium">QA</th>
                  <th className="px-3 py-2 font-medium">Dev#</th>
                  <th className="px-3 py-2 font-medium">QA#</th>
                  <th className="px-3 py-2 font-medium">Sprints</th>
                  <th className="px-3 py-2 font-medium">Cost</th>
                  <th className="px-3 py-2 font-medium">Effort</th>
                  {canPickSandbox ? <th className="px-3 py-2 font-medium">Sandbox</th> : null}
                </tr>
              </thead>
              <tbody>
                {allMixes.map((row, idx) => {
                  const isObjectiveBest = objectiveBestMix ? sameMix(row, objectiveBestMix) : idx === 0;
                  const isApplied = Boolean(sandboxForExpand && sameMix(row, sandboxForExpand));
                  return (
                    <tr
                      key={`${mixKey(row)}-${idx}`}
                      className={`border-t border-[var(--line)] ${
                        isObjectiveBest && !isApplied
                          ? "bg-emerald-50/80"
                          : isApplied
                            ? "bg-sky-50/80"
                            : ""
                      }`}
                    >
                      <td className="px-3 py-1.5">
                        {row.bestDevLevel}
                        {isObjectiveBest ? (
                          <span className="ml-2 text-[10px] font-semibold uppercase text-emerald-700">
                            best
                          </span>
                        ) : null}
                        {isApplied ? (
                          <span className="ml-2 text-[10px] font-semibold uppercase text-sky-700">
                            sandbox
                          </span>
                        ) : null}
                      </td>
                      <td className="px-3 py-1.5">{row.bestQaLevel}</td>
                      <td className="px-3 py-1.5">{row.devCount}</td>
                      <td className="px-3 py-1.5">{row.qaCount}</td>
                      <td className="px-3 py-1.5">{row.sprints}</td>
                      <td className="px-3 py-1.5">{formatMoney(row.cost, currency)}</td>
                      <td className="px-3 py-1.5">{row.effort}</td>
                      {canPickSandbox ? (
                        <td className="px-3 py-1.5">
                          <button
                            type="button"
                            className="btn-ghost px-2 py-1 text-xs"
                            disabled={isApplied}
                            title={
                              isApplied
                                ? "Already the sandbox mix for this team"
                                : "Rewrite sandbox only — does not change the governed estimate"
                            }
                            onClick={() => onPickSandboxMix(expandTeamId, row)}
                          >
                            {isApplied ? "In sandbox" : "Use this mix"}
                          </button>
                        </td>
                      ) : null}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
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
          Sensitivity view — the CR stays with {owningTeamName} unless you Accept with team
          reassignment. Does not change the estimate until Accept.
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
