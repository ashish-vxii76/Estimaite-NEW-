"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DEFAULT_CONFIG } from "@/domain/estimation/defaultConfig";
import { DEFAULT_READINESS_CRITERIA } from "@/domain/estimation/readiness";
import { calculateComplexityIndex } from "@/domain/estimation/complexity";
import { formatMoney } from "@/lib/utils";
import { GovernedSummary } from "@/components/GovernedSummary";
import { ExplanationPanel } from "@/components/ui";
import type {
  ComplexityDimensionConfig,
  EstimateCalculationResult,
} from "@/domain/estimation/types";

const MOMENTS = [
  { id: "ready", label: "Ready" },
  { id: "size", label: "Size" },
  { id: "plan", label: "Plan & cost" },
  { id: "govern", label: "Govern" },
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
  capabilities = {
    canEdit: true,
    canSubmit: true,
    canReview: true,
    canApprove: true,
    canOverride: true,
    teamLocked: false,
  },
}: {
  estimateId?: string;
  initial?: Record<string, unknown>;
  teams: Team[];
  locations: Location[];
  /** Hydrated Size-step dimensions (labels score 1–5). Defaults to DEFAULT_CONFIG. */
  complexityDimensions?: ComplexityDimensionConfig[];
  capabilities?: {
    canEdit: boolean;
    canSubmit: boolean;
    canReview: boolean;
    canApprove: boolean;
    canOverride: boolean;
    teamLocked: boolean;
  };
}) {
  const router = useRouter();
  const sizeDimensions = complexityDimensions.length
    ? complexityDimensions
    : DEFAULT_CONFIG.complexityDimensions;
  const initialResult = (initial?.result as EstimateCalculationResult) ?? null;
  const [moment, setMoment] = useState<MomentId>(initialResult ? "govern" : "ready");
  const [id, setId] = useState(estimateId);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<EstimateCalculationResult | null>(initialResult);
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
    readiness: Object.fromEntries(DEFAULT_READINESS_CRITERIA.map((c) => [c.id, "YES"])) as Record<
      string,
      string
    >,
    locationId: locations.find((l) => l.name === (teams[0]?.mappedLocation ?? ""))?.id ?? locations[0]?.id ?? "",
    locationName: teams[0]?.mappedLocation ?? locations[0]?.name ?? "",
  });

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
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const momentIndex = MOMENTS.findIndex((m) => m.id === moment);

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
              Four moments. Same governed engine. The summary stays on the right while you work.
            </p>
          </div>
          <Link href="/estimates" className="btn-ghost">
            Cancel
          </Link>
        </div>

        <ol className="flex flex-wrap gap-2">
          {MOMENTS.map((m, i) => (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => setMoment(m.id)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                  moment === m.id
                    ? "border-[var(--navy)] bg-[var(--navy)] text-white"
                    : i < momentIndex
                      ? "border-[var(--line)] bg-white text-[var(--navy)]"
                      : "border-[var(--line)] bg-[var(--bg)] text-[var(--muted)]"
                }`}
              >
                {i + 1}. {m.label}
              </button>
            </li>
          ))}
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
              <Field label="Owning team">
                <select
                  value={form.teamId}
                  disabled={capabilities.teamLocked || !capabilities.canEdit}
                  onChange={(e) => applyTeam(e.target.value)}
                >
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
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
              <Field label="Release">
                <input value={form.release} onChange={(e) => setForm({ ...form, release: e.target.value })} />
              </Field>
              <Field label="Jira ID">
                <input value={form.jiraId} onChange={(e) => setForm({ ...form, jiraId: e.target.value })} />
              </Field>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-[var(--navy)]">Definition of Ready</h4>
              <p className="mb-3 text-xs text-[var(--muted)]">
                Yes or No only. Score is the count of Yes (0–5). Fewer than 3 Yes returns Discovery Required.
              </p>
              <div className="grid gap-3 md:grid-cols-2">
                {DEFAULT_READINESS_CRITERIA.map((c) => (
                  <Field key={c.id} label={c.label}>
                    <select
                      value={form.readiness[c.id]}
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
            <div className="space-y-3">
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
            {form.workItemType === "EPIC" ? (
              <p className="rounded-lg border border-dashed border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--warn)]">
                COST DEFERRED — ROM Epic; cost at Story level. Commercial inputs are cleared.
              </p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
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
                        locationName: "",
                        locationId: "",
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
                {form.costingBasis === "TEAM" ? (
                  <>
                    <Field label="Team name">
                      <select
                        value={form.teamId}
                        disabled={capabilities.teamLocked || !capabilities.canEdit}
                        onChange={(e) => applyTeam(e.target.value)}
                      >
                        {teams.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    </Field>
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
                  </>
                ) : (
                  <Field label="Location rate card" className="md:col-span-2">
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
              </div>
            )}
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Dev seniority">
                <select
                  value={form.devResourceLevel}
                  onChange={(e) => setForm({ ...form, devResourceLevel: e.target.value })}
                >
                  {DEFAULT_CONFIG.resourceLevels.map((l) => (
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
                  {DEFAULT_CONFIG.resourceLevels.map((l) => (
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
                  onChange={(e) => setForm({ ...form, availableDev: Number(e.target.value) })}
                />
              </Field>
              <Field label="Available QA">
                <input
                  type="number"
                  min={0}
                  value={form.availableQa}
                  onChange={(e) => setForm({ ...form, availableQa: Number(e.target.value) })}
                />
              </Field>
              <Field label="Target sprints">
                <input
                  type="number"
                  min={1}
                  value={form.targetSprints}
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
                    DRAFT → READY FOR REVIEW → REVIEWED → APPROVED.
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
                    {capabilities.canSubmit ? (
                      <button className="btn-primary" onClick={() => workflow("submit")} disabled={busy} type="button">
                        Submit for review
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
                    {!capabilities.canEdit && !capabilities.canSubmit && !capabilities.canReview && !capabilities.canApprove ? (
                      <p className="text-sm text-[var(--muted)]">View only for this profile.</p>
                    ) : null}
                  </div>
                </section>
                <section className="card p-5 text-sm text-[var(--muted)]">
                  Capture actuals after delivery from the estimate record below. Variance is actual versus
                  the snapshot, not a live recalculation.
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
