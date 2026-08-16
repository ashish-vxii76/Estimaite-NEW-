"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DEFAULT_CONFIG } from "@/domain/estimation/defaultConfig";
import { DEFAULT_READINESS_CRITERIA } from "@/domain/estimation/readiness";
import { ExplanationPanel, StatusBadge } from "@/components/ui";
import { formatMoney } from "@/lib/utils";
import type { EstimateCalculationResult } from "@/domain/estimation/types";

const STEPS = [
  "Work Item",
  "Definition of Ready",
  "Complexity",
  "Team & Resources",
  "AI & Planning",
  "Costing",
  "Results",
  "Review & Approval",
];

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

export function EstimateWizard({
  estimateId,
  initial,
  teams,
  locations,
}: {
  estimateId?: string;
  initial?: Record<string, unknown>;
  teams: Team[];
  locations: Location[];
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [id, setId] = useState(estimateId);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<EstimateCalculationResult | null>(
    (initial?.result as EstimateCalculationResult) ?? null,
  );
  const [overrideSp, setOverrideSp] = useState(8);
  const [overrideReason, setOverrideReason] = useState("");
  const [form, setForm] = useState({
    workItemType: (initial?.workItemType as string) ?? "ISSUE",
    reference: (initial?.reference as string) ?? `CR-${Date.now().toString().slice(-6)}`,
    title: (initial?.title as string) ?? "New work item",
    description: (initial?.description as string) ?? "",
    teamId: (initial?.teamId as string) ?? teams[0]?.id ?? "",
    requester: (initial?.requester as string) ?? "Alex Requester",
    stance: (initial?.stance as string) ?? "NEUTRAL",
    planningMode: (initial?.planningMode as string) ?? "RESOURCE_CONSTRAINED",
    costingModel: (initial?.costingModel as string) ?? "RESOURCE_SPRINT",
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
    readiness: Object.fromEntries(
      DEFAULT_READINESS_CRITERIA.map((c) => [c.id, "YES"]),
    ) as Record<string, string>,
    locationId: locations[0]?.id ?? "",
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
    const loc = locations.find((l) => l.id === form.locationId) ?? locations[0];
    return {
      workItemType: form.workItemType,
      reference: form.reference,
      title: form.title,
      description: form.description,
      teamId: form.teamId,
      requester: form.requester,
      stance: form.stance,
      planningMode: form.planningMode,
      costingModel: form.costingModel,
      currency: form.currency,
      devResourceLevel: form.devResourceLevel,
      qaResourceLevel: form.qaResourceLevel,
      devAiProductivity: form.devAiProductivity,
      qaAiProductivity: form.qaAiProductivity,
      availableDev: form.availableDev,
      availableQa: form.availableQa,
      targetSprints: form.targetSprints,
      otherFixedCost: form.otherFixedCost,
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
  }, [form, locations]);

  async function persist() {
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
      setStep(6);
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

  return (
    <div className="space-y-5">
      <div className="sticky-summary card sticky top-3 z-10 flex flex-wrap gap-3 px-4 py-3 text-sm">
        <span>T-Shirt {result?.effectiveTshirt ?? "—"}</span>
        <span>SP {result?.selectedSp ?? "—"}</span>
        <span>Dev {result?.devSp ?? "—"}</span>
        <span>QA {result?.qaSp ?? "—"}</span>
        <span>Sprints {result?.finalSprints ?? "—"}</span>
        <span>
          Cost {result ? formatMoney(result.aiAdjustedDeliveryCost, result.currency) : "—"}
        </span>
        <span>Confidence {result?.confidence ?? "—"}</span>
        <span>Decision {result?.governanceDecision ?? "—"}</span>
      </div>

      <ol className="flex flex-wrap gap-2 text-xs">
        {STEPS.map((label, i) => (
          <li key={label}>
            <button
              className={`rounded-full px-3 py-1 ${i === step ? "bg-teal-400 text-slate-950" : "bg-[var(--panel-2)]"}`}
              onClick={() => setStep(i)}
            >
              {i + 1}. {label}
            </button>
          </li>
        ))}
      </ol>

      {error ? <p className="text-sm text-rose-300">{error}</p> : null}

      {step === 0 && (
        <section className="card grid gap-4 p-5 md:grid-cols-2">
          <Field label="Work item type">
            <select
              value={form.workItemType}
              onChange={(e) => setForm({ ...form, workItemType: e.target.value })}
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
            <select value={form.teamId} onChange={(e) => setForm({ ...form, teamId: e.target.value })}>
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
        </section>
      )}

      {step === 1 && (
        <section className="card space-y-3 p-5">
          <p className="text-sm text-[var(--muted)]">
            Yes / Partial / No. Low readiness can return DISCOVERY REQUIRED or SPIKE REQUIRED.
          </p>
          {DEFAULT_READINESS_CRITERIA.map((c) => (
            <Field key={c.id} label={c.label}>
              <select
                value={form.readiness[c.id]}
                onChange={(e) =>
                  setForm({ ...form, readiness: { ...form.readiness, [c.id]: e.target.value } })
                }
              >
                <option>YES</option>
                <option>PARTIAL</option>
                <option>NO</option>
              </select>
            </Field>
          ))}
        </section>
      )}

      {step === 2 && (
        <section className="card space-y-4 p-5">
          {DEFAULT_CONFIG.complexityDimensions.map((d) => (
            <label key={d.id} className="block">
              <div className="flex justify-between text-sm">
                <span>{d.name}</span>
                <span className="text-teal-300">{form.scores[d.id]}</span>
              </div>
              <p className="text-xs text-[var(--muted)]">{d.guidance}</p>
              <input
                type="range"
                min={1}
                max={5}
                value={form.scores[d.id]}
                onChange={(e) =>
                  setForm({ ...form, scores: { ...form.scores, [d.id]: Number(e.target.value) } })
                }
                className="mt-2 w-full"
              />
            </label>
          ))}
        </section>
      )}

      {step === 3 && (
        <section className="card grid gap-4 p-5 md:grid-cols-2">
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
          <p className="md:col-span-2 text-sm text-[var(--muted)]">
            Seniority changes capacity and effort, not the story-point estimate.
          </p>
        </section>
      )}

      {step === 4 && (
        <section className="card grid gap-4 p-5 md:grid-cols-2">
          <Field label="Dev AI productivity (0–0.5)">
            <input
              type="number"
              min={0}
              max={0.5}
              step={0.05}
              value={form.devAiProductivity}
              onChange={(e) => setForm({ ...form, devAiProductivity: Number(e.target.value) })}
            />
          </Field>
          <Field label="QA AI productivity (0–0.5)">
            <input
              type="number"
              min={0}
              max={0.5}
              step={0.05}
              value={form.qaAiProductivity}
              onChange={(e) => setForm({ ...form, qaAiProductivity: Number(e.target.value) })}
            />
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
          <p className="md:col-span-2 text-sm text-[var(--muted)]">
            AI never silently uplifts an approved estimate. Leave at 0 unless explicitly assumed.
          </p>
        </section>
      )}

      {step === 5 && (
        <section className="card grid gap-4 p-5 md:grid-cols-2">
          <Field label="Commercial model">
            <select
              value={form.costingModel}
              onChange={(e) => setForm({ ...form, costingModel: e.target.value })}
            >
              <option value="RESOURCE_SPRINT">Resource cost per sprint</option>
              <option value="TEAM_SPRINT">Team cost per sprint</option>
            </select>
          </Field>
          <Field label="Location (100% allocation)">
            <select
              value={form.locationId}
              onChange={(e) => setForm({ ...form, locationId: e.target.value })}
            >
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name} — {l.dailyRate} {l.currency}/day
                </option>
              ))}
            </select>
          </Field>
          <Field label="Other / fixed cost">
            <input
              type="number"
              min={0}
              value={form.otherFixedCost}
              onChange={(e) => setForm({ ...form, otherFixedCost: Number(e.target.value) })}
            />
          </Field>
          <p className="md:col-span-2 text-sm text-[var(--muted)]">
            Changing a commercial rate does not alter complexity, T-shirt, SP or engineering effort.
          </p>
        </section>
      )}

      {step >= 6 && result && (
        <section className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <Stat label="Assessed / effective" value={`${result.assessedTshirt} → ${result.effectiveTshirt}`} />
            <Stat label="Selected SP" value={String(result.selectedSp)} />
            <Stat label="Dev / QA SP" value={`${result.devSp} / ${result.qaSp}`} />
            <Stat label="Final sprints" value={String(result.finalSprints)} />
            <Stat label="Baseline cost" value={formatMoney(result.baselineDeliveryCost, result.currency)} />
            <Stat label="AI-adjusted cost" value={formatMoney(result.aiAdjustedDeliveryCost, result.currency)} />
            <Stat
              label="AI avoidance"
              value={formatMoney(result.estimatedAiCostAvoidance, result.currency)}
            />
            <Stat label="Governance" value={result.governanceDecision} />
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusBadge status={result.confidence} />
            <StatusBadge status={result.governanceDecision} />
          </div>
          <p className="text-sm text-[var(--muted)]">
            SP-equivalent reference effort {result.referenceEffortPd} PD vs resource-aware effort{" "}
            {result.adjustedTotalEffortPd} PD. These models are not required to match.
          </p>
          <div className="space-y-2">
            {Object.values(result.explanations).map((ex) => (
              <ExplanationPanel key={ex.title} {...ex} />
            ))}
          </div>
        </section>
      )}

      {step === 7 && (
        <section className="card space-y-4 p-5">
          <p className="text-sm text-[var(--muted)]">
            DRAFT → READY FOR REVIEW → REVIEWED → APPROVED. Automated SP stays immutable when
            overriding.
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
            <button className="rounded-lg bg-[var(--panel-2)] px-3 py-2" onClick={override} disabled={busy}>
              Apply governed override
            </button>
            <button className="rounded-lg bg-teal-400 px-3 py-2 text-slate-950" onClick={() => workflow("submit")} disabled={busy}>
              Submit for review
            </button>
            <button className="rounded-lg bg-[var(--panel-2)] px-3 py-2" onClick={() => workflow("review")} disabled={busy}>
              Mark reviewed
            </button>
            <button className="rounded-lg bg-[var(--panel-2)] px-3 py-2" onClick={() => workflow("approve")} disabled={busy}>
              Approve
            </button>
            <button className="rounded-lg bg-rose-500/20 px-3 py-2 text-rose-200" onClick={() => workflow("reject")} disabled={busy}>
              Reject
            </button>
          </div>
        </section>
      )}

      <div className="flex justify-between">
        <button
          className="rounded-lg border border-[var(--line)] px-4 py-2"
          onClick={() => setStep(Math.max(0, step - 1))}
          disabled={step === 0}
        >
          Back
        </button>
        {step < 6 ? (
          <button
            className="rounded-lg bg-teal-400 px-4 py-2 text-slate-950"
            onClick={() => (step === 5 ? calculate() : persist().then(() => setStep(step + 1)))}
            disabled={busy}
          >
            {step === 5 ? "Calculate" : "Continue"}
          </button>
        ) : step === 6 ? (
          <button className="rounded-lg bg-teal-400 px-4 py-2 text-slate-950" onClick={() => setStep(7)}>
            Review & approval
          </button>
        ) : null}
      </div>
    </div>
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
  return (
    <label className={`block text-sm ${className}`}>
      <span className="mb-1 block text-[var(--muted)]">{label}</span>
      <div className="[&_input]:w-full [&_input]:rounded-lg [&_input]:border [&_input]:border-[var(--line)] [&_input]:bg-[var(--panel-2)] [&_input]:px-3 [&_input]:py-2 [&_select]:w-full [&_select]:rounded-lg [&_select]:border [&_select]:border-[var(--line)] [&_select]:bg-[var(--panel-2)] [&_select]:px-3 [&_select]:py-2 [&_textarea]:w-full [&_textarea]:rounded-lg [&_textarea]:border [&_textarea]:border-[var(--line)] [&_textarea]:bg-[var(--panel-2)] [&_textarea]:px-3 [&_textarea]:py-2">
        {children}
      </div>
    </label>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs uppercase tracking-wide text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}
