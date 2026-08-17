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
  "Scope",
  "Complexity",
  "Costing & Commercial Basis",
  "Resource & Planning",
  "Automated Delivery Estimate",
  "Cost Method & Estimation",
  "Review & Override",
  "Final Governed Summary",
  "Actuals & Variance",
  "Scenario / Stance / Effort",
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
    readiness: Object.fromEntries(
      DEFAULT_READINESS_CRITERIA.map((c) => [c.id, "YES"]),
    ) as Record<string, string>,
    locationId: locations[0]?.id ?? "",
    locationName: locations[0]?.name ?? "",
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
      project: form.project,
      programme: form.programme,
      release: form.release,
      jiraId: form.jiraId,
      stance: form.stance,
      planningMode: form.planningMode,
      costingModel: "RESOURCE_SPRINT",
      costingBasis: form.workItemType === "EPIC" ? undefined : form.costingBasis,
      locationName: form.costingBasis === "LOCATION" ? form.locationName : "",
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
        <span>Flag {result?.deliveryFlag ?? "—"}</span>
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
            Yes or No only. Score is the count of Yes (0–5). Fewer than 3 Yes returns Discovery Required.
          </p>
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
        </section>
      )}

      {step === 2 && (
        <section className="card grid gap-4 p-5 md:grid-cols-2">
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
        </section>
      )}

      {step === 3 && (
        <section className="card space-y-4 p-5">
          {DEFAULT_CONFIG.complexityDimensions.map((d) => (
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
        </section>
      )}

      {step === 4 && (
        <section className="card grid gap-4 p-5 md:grid-cols-2">
          {form.workItemType === "EPIC" ? (
            <p className="md:col-span-2 text-sm text-amber-200">
              COST DEFERRED — ROM Epic; cost at Story level. Commercial inputs are cleared.
            </p>
          ) : (
            <>
              <Field label="Costing basis">
                <select
                  value={form.costingBasis}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      costingBasis: e.target.value,
                      locationName: e.target.value === "TEAM" ? "" : form.locationName,
                    })
                  }
                >
                  <option value="TEAM">Team</option>
                  <option value="LOCATION">Location</option>
                </select>
              </Field>
              <Field label="Cost method">
                <input value={form.costMethod} readOnly />
              </Field>
              <Field label="Location rate card">
                <select
                  disabled={form.costingBasis !== "LOCATION"}
                  value={form.costingBasis === "LOCATION" ? form.locationName : ""}
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
        </section>
      )}

      {step === 5 && (
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
          <Field label="Dev AI productivity %">
            <input
              type="number"
              min={0}
              max={100}
              step={1}
              value={Math.round(form.devAiProductivity * 100)}
              onChange={(e) =>
                setForm({ ...form, devAiProductivity: Number(e.target.value) / 100 })
              }
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
            AI is 0–100% in the form and 0–1 in the engine. It increases capacity; it never reduces SP.
          </p>
        </section>
      )}

      {(step === 6 || step === 7 || step === 9 || step === 11) && result && (
        <section className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <Stat label="Index" value={String(result.complexityIndex)} />
            <Stat label="Assessed / effective" value={`${result.assessedTshirt} → ${result.effectiveTshirt}`} />
            <Stat label="Selected SP" value={String(result.selectedSp)} />
            <Stat label="Dev / QA SP" value={`${result.devSp} / ${result.qaSp}`} />
            <Stat label="Final sprints" value={String(result.finalSprints)} />
            <Stat label="Utilisation" value={`${result.utilisation}%`} />
            <Stat label="Baseline cost" value={formatMoney(result.baselineDeliveryCost, result.currency)} />
            <Stat label="AI-adjusted cost" value={formatMoney(result.aiAdjustedDeliveryCost, result.currency)} />
            <Stat
              label="AI avoidance"
              value={formatMoney(result.estimatedAiCostAvoidance, result.currency)}
            />
            <Stat label="Effort PD" value={String(result.adjustedTotalEffortPd)} />
            <Stat label="Blended daily" value={String(result.blendedDailyRate)} />
            <Stat label="Effort-based cost" value={formatMoney(result.effortBasedCost, result.currency)} />
            <Stat label="Delivery flag" value={result.deliveryFlag} />
            <Stat label="Final decision" value={result.governanceDecision} />
            <Stat label="DoR" value={`${result.readinessScore} / ${result.dorStatus}`} />
            <Stat label="Opt / Pes SP" value={`${result.optimisticSp} / ${result.pessimisticSp}`} />
          </div>
          {result.epicSummary ? <p className="text-sm text-teal-200">{result.epicSummary}</p> : null}
          {result.costApplicability !== "OK" ? (
            <p className="text-sm text-amber-200">{result.costApplicability}</p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <StatusBadge status={result.confidence} />
            <StatusBadge status={result.deliveryFlag} />
            <StatusBadge status={result.governanceDecision} />
          </div>
          {step === 7 && form.workItemType !== "EPIC" ? (
            <Field label="Other / fixed cost">
              <input
                type="number"
                min={0}
                value={form.otherFixedCost}
                onChange={(e) => setForm({ ...form, otherFixedCost: Number(e.target.value) })}
              />
            </Field>
          ) : null}
          <div className="space-y-2">
            {Object.values(result.explanations).map((ex) => (
              <ExplanationPanel key={ex.title} {...ex} />
            ))}
          </div>
        </section>
      )}

      {step === 8 && (
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

      {step === 10 && (
        <section className="card p-5 text-sm text-[var(--muted)]">
          Capture actuals after delivery from the estimate record. Variance is actual versus the
          snapshot, not a live recalculation.
        </section>
      )}

      <div className="flex justify-between gap-3">
        <div className="flex gap-2">
          <button
            className="rounded-lg border border-[var(--line)] px-4 py-2"
            onClick={() => setStep(Math.max(0, step - 1))}
            disabled={step === 0}
            type="button"
          >
            Back
          </button>
          <button
            type="button"
            className="rounded-lg border border-[var(--line)] px-4 py-2 text-[var(--muted)]"
            onClick={() => router.push("/estimates")}
          >
            Cancel
          </button>
        </div>
        {step < 6 ? (
          <button
            className="rounded-lg bg-teal-400 px-4 py-2 text-slate-950"
            onClick={() => (step === 5 ? calculate() : persist().then(() => setStep(step + 1)))}
            disabled={busy}
          >
            {step === 5 ? "Calculate" : "Continue"}
          </button>
        ) : step < 11 ? (
          <button className="rounded-lg bg-teal-400 px-4 py-2 text-slate-950" onClick={() => setStep(step + 1)}>
            Continue
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
