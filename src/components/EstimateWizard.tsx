"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DEFAULT_CONFIG } from "@/domain/estimation/defaultConfig";
import { calculateComplexityIndex } from "@/domain/estimation/complexity";
import { formatMoney } from "@/lib/utils";
import { GovernedSummary } from "@/components/GovernedSummary";
import { ActualsForm } from "@/components/ActualsForm";
import { WhatIfForm, type ScenarioTeam, type SavedScenarioSnapshot } from "@/components/WhatIfForm";
import { ExplanationPanel } from "@/components/ui";
import type {
  ComplexityDimensionConfig,
  EstimateCalculationInput,
  EstimateCalculationResult,
  ReadinessCriterionConfig,
  ResourceLevelConfig,
} from "@/domain/estimation/types";

const MOMENTS = [
  { id: "ready", label: "Ready" },
  { id: "size", label: "Size" },
  { id: "plan", label: "Plan & cost" },
  { id: "govern", label: "Govern" },
  { id: "final", label: "Final review" },
  { id: "scenarios", label: "Scenarios" },
  { id: "actuals", label: "Actual vs plan" },
] as const;

type MomentId = (typeof MOMENTS)[number]["id"];

type Team = {
  id: string;
  name: string;
  currency: string;
  teamSprintRate: number;
  resourceSprintRate: number;
  mappedLocation: string;
};

type Location = {
  id: string;
  name: string;
  dailyRate: number;
  currency: string;
};

type ActualsPayload = {
  actualDevPd: number;
  actualQaPd: number;
  actualSprints: number;
  actualDevResources: number;
  actualQaResources: number;
  actualOtherCost: number;
  completionDate: Date | string | null;
  varianceJson: string;
} | null;

const defaultScores = Object.fromEntries(
  DEFAULT_CONFIG.complexityDimensions.map((d) => [d.id, 3]),
);

const CanEditFields = createContext(true);

export function EstimateWizard({
  estimateId,
  initial,
  teams,
  locations,
  complexityDimensions = DEFAULT_CONFIG.complexityDimensions,
  releaseQuarters = DEFAULT_CONFIG.releaseQuarters,
  readinessCriteria = DEFAULT_CONFIG.readinessCriteria,
  resourceLevels = DEFAULT_CONFIG.resourceLevels,
  actuals = null,
  estimateStatus = "DRAFT",
  scenarioTeams = [],
  savedScenario = null,
  capabilities = {
    canEdit: true,
    canSubmit: true,
    canReview: true,
    canApprove: true,
    canOverride: true,
    canEditActuals: true,
    canWhatIf: true,
    teamLocked: false,
  },
}: {
  estimateId?: string;
  initial?: Record<string, unknown>;
  teams: Team[];
  locations: Location[];
  /** Hydrated Size-step dimensions (labels score 1–5). Defaults to DEFAULT_CONFIG. */
  complexityDimensions?: ComplexityDimensionConfig[];
  releaseQuarters?: string[];
  readinessCriteria?: ReadinessCriterionConfig[];
  resourceLevels?: ResourceLevelConfig[];
  actuals?: ActualsPayload;
  estimateStatus?: string;
  scenarioTeams?: ScenarioTeam[];
  savedScenario?: SavedScenarioSnapshot | null;
  capabilities?: {
    canEdit: boolean;
    canSubmit: boolean;
    canReview: boolean;
    canApprove: boolean;
    canOverride: boolean;
    canEditActuals?: boolean;
    canWhatIf?: boolean;
    teamLocked: boolean;
  };
}) {
  const router = useRouter();
  const sizeDimensions = complexityDimensions.length
    ? complexityDimensions
    : DEFAULT_CONFIG.complexityDimensions;
  const quarters = releaseQuarters.length ? releaseQuarters : DEFAULT_CONFIG.releaseQuarters;
  const dorCriteria = readinessCriteria.length
    ? readinessCriteria
    : DEFAULT_CONFIG.readinessCriteria;
  const levels = resourceLevels.length ? resourceLevels : DEFAULT_CONFIG.resourceLevels;
  const initialResult = (initial?.result as EstimateCalculationResult) ?? null;
  const [moment, setMoment] = useState<MomentId>(initialResult ? "govern" : "ready");
  const [id, setId] = useState(estimateId);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<EstimateCalculationResult | null>(initialResult);
  const [status, setStatus] = useState(estimateStatus);
  const [overrideSp, setOverrideSp] = useState(8);
  const [overrideReason, setOverrideReason] = useState("");
  const [form, setForm] = useState({
    workItemType: (initial?.workItemType as string) ?? "ISSUE",
    reference: (initial?.reference as string) ?? `CR-${Date.now().toString().slice(-6)}`,
    title: (initial?.title as string) ?? "New work item",
    description: (initial?.description as string) ?? "",
    teamId: (initial?.teamId as string) ?? teams[0]?.id ?? "",
    requester: (initial?.requester as string) ?? "Alex Requester",
    project: (initial?.project as string) ?? "",
    programme: (initial?.programme as string) ?? "",
    release: (initial?.release as string) ?? "",
    jiraId: (initial?.jiraId as string) ?? "",
    stance: (initial?.stance as string) ?? "NEUTRAL",
    planningMode: (initial?.planningMode as string) ?? "RESOURCE_CONSTRAINED",
    costingModel: "RESOURCE_SPRINT",
    costingBasis: "TEAM",
    costMethod: "Resource Cost per Sprint",
    projectOverrideRate: 0,
    currency: (initial?.currency as string) ?? teams[0]?.currency ?? "CHF",
    devResourceLevel: (initial?.devResourceLevel as string) ?? "intermediate",
    qaResourceLevel: (initial?.qaResourceLevel as string) ?? "experienced",
    devAiProductivity: Number(initial?.devAiProductivity ?? 0),
    qaAiProductivity: Number(initial?.qaAiProductivity ?? 0),
    availableDev: Number(initial?.availableDev ?? 1),
    availableQa: Number(initial?.availableQa ?? 1),
    targetSprints: Number(initial?.targetSprints ?? 1),
    otherFixedCost: Number(initial?.otherFixedCost ?? 0),
    scores: Array.isArray(initial?.complexityScores)
      ? Object.fromEntries(
          (initial.complexityScores as { dimensionId: string; score: number }[]).map((s) => [
            s.dimensionId,
            s.score,
          ]),
        )
      : defaultScores,
    readiness: Object.fromEntries(dorCriteria.map((c) => [c.id, "YES"])) as Record<
      string,
      string
    >,
    locationId: locations.find((l) => l.name === (teams[0]?.mappedLocation ?? ""))?.id ?? locations[0]?.id ?? "",
    locationName: teams[0]?.mappedLocation ?? locations[0]?.name ?? "",
  });

  useEffect(() => {
    setStatus(estimateStatus);
  }, [estimateStatus]);

  // Restore costing basis from stored commercial mix when editing.
  useEffect(() => {
    const mix = initial?.locationMixJson;
    if (typeof mix !== "string") return;
    try {
      const parsed = JSON.parse(mix) as Array<{ costingBasis?: string; locationName?: string; projectOverrideRate?: number | null; costMethod?: string }>;
      const first = parsed[0];
      if (!first) return;
      setForm((f) => ({
        ...f,
        costingBasis: first.costingBasis === "LOCATION" ? "LOCATION" : f.costingBasis || "TEAM",
        locationName: first.locationName || f.locationName,
        projectOverrideRate: first.projectOverrideRate ?? f.projectOverrideRate,
        costMethod: first.costMethod || f.costMethod,
      }));
    } catch {
      /* ignore */
    }
  }, [initial?.locationMixJson]);

  useEffect(() => {
    if (initial?.readiness) {
      const ready = Object.fromEntries(
        (initial.readiness as { criterionId: string; answer: string }[]).map((r) => [
          r.criterionId,
          r.answer,
        ]),
      );
      setForm((f) => ({ ...f, readiness: { ...f.readiness, ...ready } }));
    }
  }, [initial]);

  const payload = useMemo(() => {
    const team = teams.find((t) => t.id === form.teamId);
    const loc =
      form.costingBasis === "TEAM"
        ? locations.find((l) => l.name === team?.mappedLocation) ?? locations[0]
        : locations.find((l) => l.id === form.locationId) ?? locations[0];
    return {
      workItemType: form.workItemType,
      reference: form.reference,
      title: form.title,
      description: form.description,
      teamId: form.teamId,
      requester: form.requester,
      project: form.project,
      programme: form.programme,
      release: form.release,
      jiraId: form.jiraId,
      stance: form.stance,
      planningMode: form.planningMode,
      costingModel: "RESOURCE_SPRINT",
      costingBasis: form.workItemType === "EPIC" ? undefined : form.costingBasis,
      locationName:
        form.workItemType === "EPIC"
          ? ""
          : form.costingBasis === "TEAM"
            ? (teams.find((t) => t.id === form.teamId)?.mappedLocation ?? form.locationName)
            : form.locationName,
      costMethod: form.workItemType === "EPIC" ? "" : form.costMethod,
      projectOverrideRate:
        form.workItemType === "EPIC" || !form.projectOverrideRate ? null : form.projectOverrideRate,
      currency: form.currency,
      devResourceLevel: form.devResourceLevel,
      qaResourceLevel: form.qaResourceLevel,
      devAiProductivity: form.devAiProductivity,
      qaAiProductivity: form.qaAiProductivity,
      availableDev: form.availableDev,
      availableQa: form.availableQa,
      targetSprints: form.targetSprints,
      otherFixedCost: form.workItemType === "EPIC" ? 0 : form.otherFixedCost,
      complexityScores: Object.entries(form.scores).map(([dimensionId, score]) => ({
        dimensionId,
        score,
      })),
      readiness: Object.entries(form.readiness).map(([criterionId, answer]) => ({
        criterionId,
        answer,
      })),
      locationMix: loc
        ? [
            {
              locationId: loc.id,
              locationName: loc.name,
              allocationPct: 100,
              dailyRate: loc.dailyRate,
              currency: loc.currency,
            },
          ]
        : [],
    };
  }, [form, locations, teams]);

  const selectedTeam = teams.find((t) => t.id === form.teamId);

  function applyTeam(teamId: string) {
    const team = teams.find((t) => t.id === teamId);
    const loc = locations.find((l) => l.name === team?.mappedLocation);
    setForm((current) => ({
      ...current,
      teamId,
      currency: team?.currency ?? current.currency,
      locationName: team?.mappedLocation ?? "",
      locationId: loc?.id ?? "",
    }));
  }

  const previewIndex = useMemo(() => {
    try {
      return calculateComplexityIndex(
        Object.entries(form.scores).map(([dimensionId, score]) => ({
          dimensionId,
          score: Number(score),
        })),
        { ...DEFAULT_CONFIG, complexityDimensions: sizeDimensions },
      ).index;
    } catch {
      return 0;
    }
  }, [form.scores, sizeDimensions]);

  async function persist() {
    if (!capabilities.canEdit && id) {
      setError("This profile cannot edit this estimate");
      return null;
    }
    setError("");
    setBusy(true);
    try {
      if (!id) {
        const res = await fetch("/api/estimates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(JSON.stringify(data.error));
        setId(data.estimate.id);
        router.replace(`/estimates/${data.estimate.id}`);
        return data.estimate.id as string;
      }
      const res = await fetch(`/api/estimates/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      return id;
    } catch (e) {
      setError((e as Error).message);
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function calculate() {
    const savedId = await persist();
    if (!savedId) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/estimates/${savedId}/calculate`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Calculation failed");
      setResult(data.result);
      setMoment("govern");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function workflow(path: string) {
    if (!id) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/estimates/${id}/${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Action failed");
      if (data.estimate?.status) setStatus(data.estimate.status);
      else if (path === "submit") setStatus("READY_FOR_REVIEW");
      else if (path === "review") setStatus("REVIEWED");
      else if (path === "approve") setStatus("APPROVED");
      else if (path === "reject") setStatus("RETURNED");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function override() {
    if (!id) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/estimates/${id}/override`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ overrideSp, reason: overrideReason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Override failed");
      setResult(data.result);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const readyComplete =
    Boolean(form.reference.trim()) &&
    Boolean(form.title.trim()) &&
    dorCriteria.every((c) => form.readiness[c.id] === "YES" || form.readiness[c.id] === "NO");
  const sizeComplete = sizeDimensions.every((d) => Number(form.scores[d.id]) >= 1);
  const planComplete = Boolean(result);
  const governComplete = Boolean(result);
  const finalUnlocked = readyComplete && sizeComplete && planComplete && governComplete;
  const postApprovalUnlocked = status === "APPROVED" || status === "COMPLETED";
  const scenariosUnlocked =
    Boolean(result) &&
    ["READY_FOR_REVIEW", "REVIEWED", "APPROVED", "COMPLETED"].includes(status);
  const resourceConstrained = form.planningMode === "RESOURCE_CONSTRAINED";
  const teamCosting = form.costingBasis === "TEAM";

  function tabEnabled(tab: MomentId) {
    if (tab === "final") return finalUnlocked;
    if (tab === "scenarios") return scenariosUnlocked;
    if (tab === "actuals") return postApprovalUnlocked;
    return true;
  }

  function goTo(tab: MomentId) {
    if (!tabEnabled(tab)) return;
    setMoment(tab);
  }

  const momentIndex = MOMENTS.findIndex((m) => m.id === moment);
  const variance = actuals
    ? (() => {
        try {
          return JSON.parse(actuals.varianceJson) as Record<string, number | string | null>;
        } catch {
          return null;
        }
      })()
    : null;
  const pctLabel = (v: number | null | undefined) =>
    v == null || Number.isNaN(Number(v)) ? "—" : `${(Number(v) * 100).toFixed(1)}%`;
  const devLevel = levels.find((l) => l.id === form.devResourceLevel);
  const qaLevel = levels.find((l) => l.id === form.qaResourceLevel);

  const whatIfBase = useMemo((): EstimateCalculationInput => {
    const team = teams.find((t) => t.id === form.teamId);
    const loc =
      form.costingBasis === "TEAM"
        ? locations.find((l) => l.name === team?.mappedLocation) ?? locations[0]
        : locations.find((l) => l.id === form.locationId) ??
          locations.find((l) => l.name === form.locationName) ??
          locations[0];
    return {
      workItemType: form.workItemType as EstimateCalculationInput["workItemType"],
      complexityScores: Object.entries(form.scores).map(([dimensionId, score]) => ({
        dimensionId,
        score: Number(score),
      })),
      readiness: Object.entries(form.readiness).map(([criterionId, answer]) => ({
        criterionId,
        answer: answer as "YES" | "NO",
      })),
      stance: form.stance as EstimateCalculationInput["stance"],
      costingBasis: form.workItemType === "EPIC" ? undefined : (form.costingBasis as "TEAM" | "LOCATION"),
      teamId: form.teamId,
      teamName: team?.name,
      locationName:
        form.costingBasis === "TEAM" ? (team?.mappedLocation ?? form.locationName) : form.locationName,
      costMethod: form.workItemType === "EPIC" ? "" : form.costMethod,
      projectOverrideRate:
        form.workItemType === "EPIC" || !form.projectOverrideRate ? null : form.projectOverrideRate,
      devResourceLevelId: form.devResourceLevel,
      qaResourceLevelId: form.qaResourceLevel,
      devAiProductivityPct: form.devAiProductivity,
      qaAiProductivityPct: form.qaAiProductivity,
      planningMode: form.planningMode as EstimateCalculationInput["planningMode"],
      availableDev: form.availableDev,
      availableQa: form.availableQa,
      targetSprints: form.targetSprints,
      costingModel: "RESOURCE_SPRINT",
      resourceSprintRate: team?.resourceSprintRate ?? 0,
      teamSprintRate: team?.teamSprintRate ?? 0,
      otherFixedCost: form.workItemType === "EPIC" ? 0 : form.otherFixedCost,
      locationAllocations: loc
        ? [
            {
              locationId: loc.id,
              locationName: loc.name,
              allocationPct: 100,
              dailyRate: loc.dailyRate,
              currency: loc.currency,
            },
          ]
        : [],
      currency: form.currency,
    };
  }, [form, teams, locations]);

  return (
    <CanEditFields.Provider value={capabilities.canEdit}>
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start">
      <div className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="kicker">Estimate</p>
            <h2 className="font-display text-2xl font-semibold text-[var(--navy)]">
              {estimateId ? "Inputs and governance" : "New estimate"}
            </h2>
            <p className="mt-1 max-w-xl text-sm text-[var(--muted)]">
              Ready through Final review to submit. Scenarios unlock after submit. Actual vs plan
              unlocks after approval.
            </p>
          </div>
          <Link href="/estimates" className="btn-ghost">
            Cancel
          </Link>
        </div>

        <ol className="flex flex-wrap gap-2">
          {MOMENTS.map((m, i) => {
            const enabled = tabEnabled(m.id);
            return (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => goTo(m.id)}
                  disabled={!enabled}
                  title={
                    !enabled
                      ? m.id === "final"
                        ? "Complete Ready, Size, Plan & cost, and Govern first"
                        : m.id === "scenarios"
                          ? "Available after the estimate is submitted for review"
                          : "Available after the estimate is approved"
                      : undefined
                  }
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                    moment === m.id
                      ? "border-[var(--navy)] bg-[var(--navy)] text-white"
                      : !enabled
                        ? "cursor-not-allowed border-[var(--line)] bg-[var(--bg)] text-[var(--muted)] opacity-50"
                        : i < momentIndex
                          ? "border-[var(--line)] bg-white text-[var(--navy)]"
                          : "border-[var(--line)] bg-[var(--bg)] text-[var(--muted)]"
                  }`}
                >
                  {i + 1}. {m.label}
                </button>
              </li>
            );
          })}
        </ol>

        {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}

        {moment === "ready" && (
          <section className="card space-y-8 p-6">
            <header>
              <p className="kicker">Moment 1</p>
              <h3 className="font-display text-xl font-semibold text-[var(--navy)]">
                Is this ready to estimate?
              </h3>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Incomplete Definition of Ready becomes a DISCOVERY REQUIRED stamp — not a silent warning.
              </p>
            </header>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Work item type">
                <select
                  value={form.workItemType}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      workItemType: e.target.value,
                      ...(e.target.value === "EPIC"
                        ? { otherFixedCost: 0, projectOverrideRate: 0, costMethod: "", costingBasis: "" }
                        : {
                            costingBasis: form.costingBasis || "TEAM",
                            costMethod: "Resource Cost per Sprint",
                          }),
                    })
                  }
                >
                  <option value="ISSUE">Issue / Story</option>
                  <option value="EPIC">Epic ROM</option>
                </select>
              </Field>
              <Field label="Work item ID / CR">
                <input
                  value={form.reference}
                  onChange={(e) => setForm({ ...form, reference: e.target.value })}
                />
              </Field>
              <Field label="Title" className="md:col-span-2">
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </Field>
              <Field label="Description" className="md:col-span-2">
                <textarea
                  rows={4}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </Field>
              <Field label="Requester">
                <input
                  value={form.requester}
                  onChange={(e) => setForm({ ...form, requester: e.target.value })}
                />
              </Field>
              <Field label="Project">
                <input value={form.project} onChange={(e) => setForm({ ...form, project: e.target.value })} />
              </Field>
              <Field label="Programme">
                <input
                  value={form.programme}
                  onChange={(e) => setForm({ ...form, programme: e.target.value })}
                />
              </Field>
              <Field label="Release quarter">
                <select
                  value={form.release}
                  onChange={(e) => setForm({ ...form, release: e.target.value })}
                >
                  <option value="">Select quarter</option>
                  {quarters.map((q) => (
                    <option key={q} value={q}>
                      {q}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="GitLab / JIRA ID (optional)">
                <input
                  value={form.jiraId}
                  onChange={(e) => setForm({ ...form, jiraId: e.target.value })}
                  placeholder="Optional"
                />
              </Field>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-[var(--navy)]">Definition of Ready</h4>
              <p className="mb-3 text-xs text-[var(--muted)]">
                Yes or No only. Score is the count of Yes (0–{dorCriteria.length}). Fewer than the
                configured assumptions threshold returns Discovery Required.
              </p>
              <div className="grid gap-3 md:grid-cols-2">
                {dorCriteria.map((c) => (
                  <Field key={c.id} label={c.label}>
                    <select
                      value={form.readiness[c.id] ?? "YES"}
                      onChange={(e) =>
                        setForm({ ...form, readiness: { ...form.readiness, [c.id]: e.target.value } })
                      }
                    >
                      <option value="YES">Yes</option>
                      <option value="NO">No</option>
                    </select>
                  </Field>
                ))}
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                className="btn-primary"
                onClick={() => (capabilities.canEdit ? persist().then(() => setMoment("size")) : setMoment("size"))}
                disabled={busy}
              >
                Continue to size
              </button>
            </div>
          </section>
        )}

        {moment === "size" && (
          <section className="card space-y-6 p-6">
            <header>
              <p className="kicker">Moment 2</p>
              <h3 className="font-display text-xl font-semibold text-[var(--navy)]">
                How complex is the work?
              </h3>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Weights stay in Administration. The index updates live: round(20 × Σ(score × weight)).
              </p>
            </header>
            <div className="flex items-baseline justify-between rounded-xl border border-[var(--line)] bg-[var(--bg)] px-4 py-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                Complexity index
              </span>
              <span className="font-display text-3xl font-semibold text-[var(--navy)]">{previewIndex}</span>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {sizeDimensions.map((d) => (
                <Field key={d.id} label={`${d.name} (weight ${d.weight})`}>
                  <select
                    value={form.scores[d.id]}
                    onChange={(e) =>
                      setForm({ ...form, scores: { ...form.scores, [d.id]: Number(e.target.value) } })
                    }
                  >
                    {(d.options ?? []).map((label, index) => (
                      <option key={label} value={index + 1}>
                        {index + 1} — {label}
                      </option>
                    ))}
                  </select>
                </Field>
              ))}
            </div>
            <div className="flex justify-between gap-2">
              <button type="button" className="btn-ghost" onClick={() => setMoment("ready")}>
                Back
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => (capabilities.canEdit ? persist().then(() => setMoment("plan")) : setMoment("plan"))}
                disabled={busy}
              >
                Continue to plan
              </button>
            </div>
          </section>
        )}

        {moment === "plan" && (
          <section className="card space-y-8 p-6">
            <header>
              <p className="kicker">Moment 3</p>
              <h3 className="font-display text-xl font-semibold text-[var(--navy)]">
                How will we staff and cost it?
              </h3>
              <p className="mt-1 text-sm text-[var(--muted)]">
                AI is 0–100% in the form and 0–1 in the engine. It increases capacity; it never reduces SP.
              </p>
            </header>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Team name">
                <select
                  value={form.teamId}
                  disabled={
                    (form.workItemType !== "EPIC" && !teamCosting) ||
                    capabilities.teamLocked ||
                    !capabilities.canEdit
                  }
                  className={
                    (form.workItemType !== "EPIC" && !teamCosting) ||
                    capabilities.teamLocked ||
                    !capabilities.canEdit
                      ? "cursor-not-allowed opacity-60"
                      : undefined
                  }
                  onChange={(e) => applyTeam(e.target.value)}
                >
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </Field>
              {form.workItemType === "EPIC" ? (
                <p className="md:col-span-2 rounded-lg border border-dashed border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--warn)]">
                  COST DEFERRED — ROM Epic; cost at Story level. Commercial inputs are cleared.
                </p>
              ) : (
                <>
                  <Field label="Costing basis">
                    <select
                      value={form.costingBasis}
                      onChange={(e) => {
                        const costingBasis = e.target.value;
                        if (costingBasis === "TEAM") {
                          const team = teams.find((t) => t.id === form.teamId);
                          const loc = locations.find((l) => l.name === team?.mappedLocation);
                          setForm({
                            ...form,
                            costingBasis,
                            locationName: team?.mappedLocation ?? "",
                            locationId: loc?.id ?? "",
                            currency: team?.currency ?? form.currency,
                          });
                          return;
                        }
                        setForm({
                          ...form,
                          costingBasis,
                        });
                      }}
                    >
                      <option value="TEAM">Team</option>
                      <option value="LOCATION">Location</option>
                    </select>
                  </Field>
                  <Field label="Cost method">
                    <input value={form.costMethod} readOnly />
                  </Field>
                  {teamCosting ? (
                    <Field label="Location (from team)">
                      <input
                        readOnly
                        value={
                          selectedTeam
                            ? `${selectedTeam.mappedLocation} · resource sprint ${selectedTeam.resourceSprintRate} ${selectedTeam.currency}`
                            : ""
                        }
                      />
                    </Field>
                  ) : (
                    <Field label="Location rate card">
                      <select
                        value={form.locationName}
                        onChange={(e) => {
                          const loc = locations.find((l) => l.name === e.target.value);
                          setForm({
                            ...form,
                            locationName: e.target.value,
                            locationId: loc?.id ?? "",
                          });
                        }}
                      >
                        <option value="">Select location</option>
                        {locations.map((l) => (
                          <option key={l.id} value={l.name}>
                            {l.name} — {l.dailyRate} {l.currency}/day
                          </option>
                        ))}
                      </select>
                    </Field>
                  )}
                  <Field label="Project override rate (optional)">
                    <input
                      type="number"
                      min={0}
                      value={form.projectOverrideRate || ""}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          projectOverrideRate: e.target.value === "" ? 0 : Number(e.target.value),
                        })
                      }
                    />
                  </Field>
                </>
              )}
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Dev seniority">
                <select
                  value={form.devResourceLevel}
                  onChange={(e) => setForm({ ...form, devResourceLevel: e.target.value })}
                >
                  {levels.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} ({l.capacitySpPerSprint} SP/sprint)
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="QA seniority">
                <select
                  value={form.qaResourceLevel}
                  onChange={(e) => setForm({ ...form, qaResourceLevel: e.target.value })}
                >
                  {levels.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} ({l.capacitySpPerSprint} SP/sprint)
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Estimate stance">
                <select value={form.stance} onChange={(e) => setForm({ ...form, stance: e.target.value })}>
                  <option value="OPTIMISTIC">Optimistic (one T-shirt lower)</option>
                  <option value="NEUTRAL">Neutral</option>
                  <option value="PESSIMISTIC">Pessimistic (one T-shirt higher)</option>
                </select>
              </Field>
              <Field label="Planning mode">
                <select
                  value={form.planningMode}
                  onChange={(e) => setForm({ ...form, planningMode: e.target.value })}
                >
                  <option value="RESOURCE_CONSTRAINED">Resource-constrained</option>
                  <option value="SPRINT_CONSTRAINED">Sprint-constrained</option>
                </select>
              </Field>
              <Field label="Dev AI productivity %">
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={Math.round(form.devAiProductivity * 100)}
                  onChange={(e) => setForm({ ...form, devAiProductivity: Number(e.target.value) / 100 })}
                />
              </Field>
              <Field label="QA AI productivity %">
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={Math.round(form.qaAiProductivity * 100)}
                  onChange={(e) => setForm({ ...form, qaAiProductivity: Number(e.target.value) / 100 })}
                />
              </Field>
              <Field label="Available Dev">
                <input
                  type="number"
                  min={0}
                  value={form.availableDev}
                  disabled={!resourceConstrained}
                  className={!resourceConstrained ? "cursor-not-allowed opacity-60" : undefined}
                  onChange={(e) => setForm({ ...form, availableDev: Number(e.target.value) })}
                />
              </Field>
              <Field label="Available QA">
                <input
                  type="number"
                  min={0}
                  value={form.availableQa}
                  disabled={!resourceConstrained}
                  className={!resourceConstrained ? "cursor-not-allowed opacity-60" : undefined}
                  onChange={(e) => setForm({ ...form, availableQa: Number(e.target.value) })}
                />
              </Field>
              <Field label="Target sprints">
                <input
                  type="number"
                  min={1}
                  value={form.targetSprints}
                  disabled={resourceConstrained}
                  className={resourceConstrained ? "cursor-not-allowed opacity-60" : undefined}
                  onChange={(e) => setForm({ ...form, targetSprints: Number(e.target.value) })}
                />
              </Field>
            </div>
            <div className="flex justify-between gap-2">
              <button type="button" className="btn-ghost" onClick={() => setMoment("size")}>
                Back
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={calculate}
                disabled={busy || !capabilities.canEdit}
              >
                Calculate & govern
              </button>
            </div>
          </section>
        )}

        {moment === "govern" && (
          <section className="space-y-6">
            <header>
              <p className="kicker">Moment 4</p>
              <h3 className="font-display text-xl font-semibold text-[var(--navy)]">Govern the result</h3>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Overrides need a reason. Automated SP stays immutable. Actuals are captured after delivery.
              </p>
            </header>
            {!result ? (
              <div className="card p-6 text-sm text-[var(--muted)]">
                Calculate from Plan & cost first. The engine has not run yet.
                <div className="mt-4">
                  <button type="button" className="btn-primary" onClick={() => setMoment("plan")}>
                    Go to plan
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="grid gap-3 md:grid-cols-3">
                  <Stat label="Utilisation" value={`${result.utilisation}%`} />
                  <Stat label="Baseline cost" value={formatMoney(result.baselineDeliveryCost, result.currency)} />
                  <Stat
                    label="AI avoidance"
                    value={formatMoney(result.estimatedAiCostAvoidance, result.currency)}
                  />
                  <Stat label="Effort PD" value={String(result.adjustedTotalEffortPd)} />
                  <Stat label="Blended daily" value={String(result.blendedDailyRate)} />
                  <Stat label="Opt / Pes SP" value={`${result.optimisticSp} / ${result.pessimisticSp}`} />
                </div>
                {form.workItemType !== "EPIC" ? (
                  <section className="card p-5">
                    <Field label="Other / fixed cost (CHF)">
                      <input
                        type="number"
                        min={0}
                        value={form.otherFixedCost}
                        onChange={(e) => setForm({ ...form, otherFixedCost: Number(e.target.value) })}
                      />
                    </Field>
                    <button type="button" className="btn-ghost mt-3" onClick={calculate} disabled={busy}>
                      Recalculate with other cost
                    </button>
                  </section>
                ) : null}
                <section className="card space-y-4 p-5">
                  <p className="text-sm text-[var(--muted)]">
                    Override here if needed. Submit for review happens on Final review after all moments are complete.
                  </p>
                  <div className="grid gap-3 md:grid-cols-2">
                    <Field label="Override SP">
                      <input
                        type="number"
                        value={overrideSp}
                        onChange={(e) => setOverrideSp(Number(e.target.value))}
                      />
                    </Field>
                    <Field label="Override reason">
                      <input value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)} />
                    </Field>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {capabilities.canOverride ? (
                      <button className="btn-secondary" onClick={override} disabled={busy} type="button">
                        Apply governed override
                      </button>
                    ) : null}
                    {capabilities.canReview ? (
                      <button className="btn-secondary" onClick={() => workflow("review")} disabled={busy} type="button">
                        Mark reviewed
                      </button>
                    ) : null}
                    {capabilities.canApprove ? (
                      <>
                        <button className="btn-secondary" onClick={() => workflow("approve")} disabled={busy} type="button">
                          Approve
                        </button>
                        <button
                          className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-[var(--danger)]"
                          onClick={() => workflow("reject")}
                          disabled={busy}
                          type="button"
                        >
                          Reject
                        </button>
                      </>
                    ) : null}
                    {finalUnlocked ? (
                      <button type="button" className="btn-primary" onClick={() => goTo("final")}>
                        Continue to final review
                      </button>
                    ) : null}
                  </div>
                </section>
                <div className="space-y-2">
                  {Object.values(result.explanations).map((ex) => (
                    <ExplanationPanel key={ex.title} {...ex} />
                  ))}
                </div>
                <button type="button" className="btn-ghost" onClick={() => setMoment("plan")}>
                  Back to plan
                </button>
              </>
            )}
          </section>
        )}

        {moment === "final" && result && (
          <section className="card space-y-6 p-6">
            <header>
              <p className="kicker">Final review</p>
              <h3 className="font-display text-xl font-semibold text-[var(--navy)]">
                Board-pack check before submit
              </h3>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Read-only summary of the CR. Submit for review when the pack is complete.
              </p>
            </header>

            <div className="overflow-hidden rounded-xl border border-[var(--line)]">
              <table className="w-full text-sm">
                <tbody>
                  {[
                    ["CR / reference", form.reference],
                    ["Title", form.title],
                    ["Release quarter", form.release || "—"],
                    ["GitLab / JIRA ID", form.jiraId || "—"],
                    ["Delivery flag", result.deliveryFlag],
                    [
                      "AI-adjusted cost",
                      formatMoney(result.aiAdjustedDeliveryCost, result.currency),
                    ],
                    ["Estimate Stance", form.stance],
                    ["Effective T-Shirt (stance-adjusted)", result.effectiveTshirt],
                    ["Optimistic SP (one size down)", String(result.optimisticSp)],
                    ["Neutral SP (assessed size)", String(result.baselineSp ?? result.selectedSp)],
                    ["Pessimistic SP (one size up)", String(result.pessimisticSp)],
                    ["Selected SP (per stance)", String(result.selectedSp)],
                    ["Complexity Effort Multiplier", String(result.complexityMultiplier)],
                    ["Dev Days per Point", String(devLevel?.daysPerPoint ?? "—")],
                    ["QA Days per Point", String(qaLevel?.daysPerPoint ?? "—")],
                    ["Adjusted Dev Effort (PD)", String(result.adjustedDevEffortPd)],
                    ["Adjusted QA Effort (PD)", String(result.adjustedQaEffortPd)],
                    ["Adjusted Total Effort (PD)", String(result.adjustedTotalEffortPd)],
                    ["Blended Daily Rate (per team)", String(result.blendedDailyRate)],
                    [
                      "Effort-Based Delivery Cost",
                      result.effortBasedCost == null
                        ? "—"
                        : formatMoney(result.effortBasedCost, result.currency),
                    ],
                    [
                      "Epic Breakdown - Suggested Stories",
                      result.epicStories == null ? "—" : String(result.epicStories),
                    ],
                    [
                      "Epic Breakdown - Approx SP / Story",
                      result.epicSpPerStory == null ? "—" : String(result.epicSpPerStory),
                    ],
                    ["Epic Breakdown - Summary", result.epicSummary ?? "—"],
                  ].map(([label, value]) => (
                    <tr key={label} className="border-t border-[var(--line)] first:border-t-0">
                      <th className="w-[40%] bg-[var(--panel-2)] px-3 py-2 text-left font-medium text-[var(--navy)]">
                        {label}
                      </th>
                      <td className="bg-emerald-50/60 px-3 py-2 font-semibold text-[var(--navy)]">{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap justify-between gap-2">
              <button type="button" className="btn-ghost" onClick={() => setMoment("govern")}>
                Back to govern
              </button>
              {capabilities.canSubmit && ["DRAFT", "RETURNED"].includes(status) ? (
                <button
                  type="button"
                  className="btn-primary"
                  disabled={busy}
                  onClick={() => workflow("submit")}
                >
                  Submit for review
                </button>
              ) : (
                <p className="text-sm text-[var(--muted)]">Status: {status}</p>
              )}
            </div>
          </section>
        )}

        {moment === "scenarios" && (
          <section className="card space-y-5 p-6">
            <header>
              <p className="kicker">Scenarios</p>
              <h3 className="font-display text-xl font-semibold text-[var(--navy)]">
                What-if — best mix &amp; best team for this CR
              </h3>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Choose an objective and run. Team is locked to this CR&apos;s owner; deadline only
                for Cheapest within N. Sandbox — never changes SP, cost, team, or status.
              </p>
            </header>
            {!scenariosUnlocked ? (
              <p className="text-sm text-[var(--muted)]">
                Submit this estimate for review to unlock Scenarios.
              </p>
            ) : !capabilities.canWhatIf ? (
              <p className="text-sm text-[var(--muted)]">
                Your role cannot run what-if scenarios. Ask an admin for Access → RBAC → What-If.
              </p>
            ) : scenarioTeams.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">
                No team roster is available for scenarios in your scope.
              </p>
            ) : (
              <WhatIfForm
                teams={scenarioTeams}
                base={whatIfBase}
                defaultTeamId={form.teamId}
                owningTeamId={form.teamId}
                estimateId={id}
                initialSaved={savedScenario}
                mode="estimate"
              />
            )}
          </section>
        )}

        {moment === "actuals" && (
          <section className="space-y-5">
            <header className="card space-y-1 p-6">
              <p className="kicker">Post-approval</p>
              <h3 className="font-display text-xl font-semibold text-[var(--navy)]">
                Actual vs plan
              </h3>
              <p className="text-sm text-[var(--muted)]">
                Enter delivery actuals, then review variance against the governed plan.
              </p>
            </header>

            {!id ? (
              <section className="card p-6 text-sm text-[var(--muted)]">
                Save the estimate first. This tab unlocks after approval.
              </section>
            ) : (
              <ActualsForm
                estimateId={id}
                actuals={actuals}
                readOnly={!capabilities.canEditActuals}
              />
            )}

            <section className="card space-y-4 p-6">
              <header>
                <p className="kicker">Variance</p>
                <h3 className="font-display text-lg font-semibold text-[var(--navy)]">
                  Against governed estimate
                </h3>
              </header>
              {!id || !actuals ? (
                <p className="text-sm text-[var(--muted)]">
                  Save actuals above to calculate variance from the governed snapshot.
                </p>
              ) : (
                <div className="overflow-hidden rounded-xl border border-[var(--line)]">
                  <table className="w-full text-sm">
                    <tbody>
                      {[
                        ["Dev PD Variance %", pctLabel(variance?.devEffortVariance as number | null)],
                        ["QA PD Variance %", pctLabel(variance?.qaEffortVariance as number | null)],
                        ["Duration Variance %", pctLabel(variance?.durationVariance as number | null)],
                        [
                          "Dev Resource Variance %",
                          result?.plannedDev
                            ? pctLabel(
                                (actuals.actualDevResources - result.plannedDev) / result.plannedDev,
                              )
                            : "—",
                        ],
                        [
                          "QA Resource Variance %",
                          result?.plannedQa
                            ? pctLabel(
                                (actuals.actualQaResources - result.plannedQa) / result.plannedQa,
                              )
                            : "—",
                        ],
                        [
                          "Actual Total Delivery Cost",
                          formatMoney(
                            (result?.aiAdjustedDeliveryCost ?? 0) + actuals.actualOtherCost,
                            result?.currency ?? form.currency,
                          ),
                        ],
                        ["Cost Variance %", pctLabel(variance?.costVariance as number | null)],
                        [
                          "Actual / Estimated Effort Ratio",
                          variance?.actualEstimatedEffortRatio == null
                            ? "—"
                            : String(variance.actualEstimatedEffortRatio),
                        ],
                      ].map(([label, value]) => (
                        <tr key={label} className="border-t border-[var(--line)] first:border-t-0">
                          <th className="w-[40%] bg-[var(--panel-2)] px-3 py-2 text-left font-medium text-[var(--navy)]">
                            {label}
                          </th>
                          <td className="bg-emerald-50/70 px-3 py-2 font-semibold text-[var(--navy)]">
                            {value}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {variance?.interpretation ? (
                    <p className="border-t border-[var(--line)] px-3 py-2 text-sm text-[var(--muted)]">
                      {String(variance.interpretation)}
                    </p>
                  ) : null}
                </div>
              )}
            </section>
          </section>
        )}
      </div>

      <GovernedSummary
        result={result}
        previewIndex={previewIndex}
        reference={form.reference}
        title={form.title}
      />
    </div>
    </CanEditFields.Provider>
  );
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  const canEdit = useContext(CanEditFields);
  return (
    <label className={`block text-sm ${className}`}>
      <span className="mb-1 block text-[var(--muted)]">{label}</span>
      <div
        className={`[&_input]:w-full [&_input]:rounded-lg [&_input]:border [&_input]:border-[var(--line)] [&_input]:bg-[var(--panel-2)] [&_input]:px-3 [&_input]:py-2 [&_select]:w-full [&_select]:rounded-lg [&_select]:border [&_select]:border-[var(--line)] [&_select]:bg-[var(--panel-2)] [&_select]:px-3 [&_select]:py-2 [&_textarea]:w-full [&_textarea]:rounded-lg [&_textarea]:border [&_textarea]:border-[var(--line)] [&_textarea]:bg-[var(--panel-2)] [&_textarea]:px-3 [&_textarea]:py-2 ${
          canEdit ? "" : "pointer-events-none opacity-80"
        }`}
      >
        {children}
      </div>
    </label>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs uppercase tracking-wide text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-lg font-semibold text-[var(--navy)]">{value}</p>
    </div>
  );
}
