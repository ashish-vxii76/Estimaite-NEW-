"use client";

import { useState } from "react";
import Link from "next/link";
import type { EstimationConfig } from "@/domain/estimation/types";

export function EstimationConfigForm({
  config,
  readOnly = false,
}: {
  config: EstimationConfig;
  readOnly?: boolean;
}) {
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
    dashboardMinEstimates: config.dashboardMinEstimates,
    calibrationMinSamples: config.calibrationMinSamples,
    indexReviewMin: config.indexReviewMin,
    indexSplitMin: config.indexSplitMin,
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
          dashboardMinEstimates: form.dashboardMinEstimates,
          calibrationMinSamples: form.calibrationMinSamples,
          indexReviewMin: form.indexReviewMin,
          indexSplitMin: form.indexSplitMin,
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
      <label className="flex items-center justify-between gap-3 text-sm">
        <span className="text-[var(--muted)]">{label}</span>
        <input
          type="number"
          step={step}
          className="w-24 shrink-0 rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-2 py-1.5 text-right tabular-nums"
          value={form[key] as number}
          disabled={readOnly}
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
          version so historical estimates stay reproducible. Dropdown catalogues (quarters, DoR,
          complexity labels, resource levels) live under{" "}
          <Link href="/admin" className="underline">
            Lists &amp; catalogues
          </Link>
          .
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
        {num("dashboardMinEstimates", "Dashboard min estimates")}
        {num("calibrationMinSamples", "Calibration min samples / level")}
        {num("indexReviewMin", "Index review minimum")}
        {num("indexSplitMin", "Index split minimum")}
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
      <section className="card space-y-2 p-5 text-sm">
        <h2 className="font-medium">Related catalogues</h2>
        <ul className="list-disc space-y-1 pl-5 text-[var(--muted)]">
          <li>
            <Link className="text-[var(--navy)] underline" href="/admin/release-quarters">
              Release quarters
            </Link>
          </li>
          <li>
            <Link className="text-[var(--navy)] underline" href="/admin/readiness-criteria">
              Definition of Ready
            </Link>
          </li>
          <li>
            <Link className="text-[var(--navy)] underline" href="/admin/complexity-dimensions">
              Complexity dimensions
            </Link>
          </li>
          <li>
            <Link className="text-[var(--navy)] underline" href="/admin/resource-mapping">
              Resource levels
            </Link>
          </li>
        </ul>
      </section>
      {readOnly ? (
        <p className="text-sm text-[var(--muted)]">Read only for this role. Admin publishes mapping versions.</p>
      ) : (
        <button className="btn-primary" onClick={save}>
          Save and publish version
        </button>
      )}
      {message ? <p className="text-sm text-[var(--ok)]">{message}</p> : null}
    </div>
  );
}
