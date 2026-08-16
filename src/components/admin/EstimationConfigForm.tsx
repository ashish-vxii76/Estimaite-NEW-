"use client";

import { useState } from "react";
import type { EstimationConfig } from "@/domain/estimation/types";

export function EstimationConfigForm({ config }: { config: EstimationConfig }) {
  const [form, setForm] = useState({
    sprintWorkingDays: config.sprintWorkingDays,
    issueMaxRecommendedSprints: config.issueMaxRecommendedSprints,
    issueReviewSp: config.issueReviewSp,
    issueSplitSp: config.issueSplitSp,
    epicDecomposeSp: config.epicDecomposeSp,
    epicSplitSp: config.epicSplitSp,
    fullTeamRateUtilisationWarning: config.fullTeamRateUtilisationWarning,
    aiMinPct: config.aiMinPct,
    aiMaxPct: config.aiMaxPct,
    readinessDiscoveryMax: config.readinessDiscoveryMax,
    readinessSpikeMax: config.readinessSpikeMax,
    xs: config.complexityMultipliers.XS,
    s: config.complexityMultipliers.S,
    m: config.complexityMultipliers.M,
    l: config.complexityMultipliers.L,
    xl: config.complexityMultipliers.XL,
    xxl: config.complexityMultipliers.XXL,
  });
  const [message, setMessage] = useState("");

  async function save() {
    const res = await fetch("/api/admin/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        section: "estimationConfig",
        estimationConfig: {
          sprintWorkingDays: form.sprintWorkingDays,
          issueMaxRecommendedSprints: form.issueMaxRecommendedSprints,
          issueReviewSp: form.issueReviewSp,
          issueSplitSp: form.issueSplitSp,
          epicDecomposeSp: form.epicDecomposeSp,
          epicSplitSp: form.epicSplitSp,
          fullTeamRateUtilisationWarning: form.fullTeamRateUtilisationWarning,
          aiMinPct: form.aiMinPct,
          aiMaxPct: form.aiMaxPct,
          readinessDiscoveryMax: form.readinessDiscoveryMax,
          readinessSpikeMax: form.readinessSpikeMax,
          complexityMultipliers: {
            XS: form.xs,
            S: form.s,
            M: form.m,
            L: form.l,
            XL: form.xl,
            XXL: form.xxl,
          },
        },
      }),
    });
    const json = await res.json();
    setMessage(res.ok ? `Saved ${json.config.versionId}` : json.error);
  }

  function num(key: keyof typeof form, label: string, step = "any") {
    return (
      <label className="text-sm">
        {label}
        <input
          type="number"
          step={step}
          className="mt-1 w-full rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-3 py-2"
          value={form[key] as number}
          onChange={(e) => setForm({ ...form, [key]: Number(e.target.value) })}
        />
      </label>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Estimation Config</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Global thresholds from the Excel estimator. Publishing creates a new configuration
          version so historical estimates stay reproducible.
        </p>
      </div>
      <section className="card grid gap-4 p-5 md:grid-cols-2">
        {num("sprintWorkingDays", "Sprint working days")}
        {num("issueMaxRecommendedSprints", "Issue max recommended sprints")}
        {num("issueReviewSp", "Issue review SP threshold")}
        {num("issueSplitSp", "Issue split SP threshold")}
        {num("epicDecomposeSp", "Epic decompose ROM SP threshold")}
        {num("epicSplitSp", "Epic split ROM SP threshold")}
        {num("fullTeamRateUtilisationWarning", "Full team rate utilisation warning (ratio)")}
        {num("aiMinPct", "AI productivity minimum")}
        {num("aiMaxPct", "AI productivity maximum")}
        {num("readinessDiscoveryMax", "Readiness: discovery required below")}
        {num("readinessSpikeMax", "Readiness: spike required below")}
      </section>
      <section className="card grid gap-4 p-5 md:grid-cols-3">
        <h2 className="md:col-span-3 font-medium">Complexity effort multipliers</h2>
        {num("xs", "XS")}
        {num("s", "S")}
        {num("m", "M")}
        {num("l", "L")}
        {num("xl", "XL")}
        {num("xxl", "XXL")}
      </section>
      <button className="rounded-lg bg-teal-400 px-4 py-2 text-slate-950" onClick={save}>
        Save and publish version
      </button>
      {message ? <p className="text-sm text-teal-200">{message}</p> : null}
    </div>
  );
}
