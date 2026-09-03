"use client";

import { statusLabel } from "@/lib/estimateLifecycle";

export function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "APPROVED" || status === "READY" || status === "HIGH" || status === "High" || status === "PLAN"
      ? "chip-ok"
      : status.includes("REQUIRED") || status === "REJECTED" || status === "SPLIT" || status === "LOW" || status === "Low" || status === "Very Low" || status === "SPLIT EPIC"
        ? "chip-bad"
        : status === "REVIEW" || status === "REVIEWED" || status === "MEDIUM" || status === "DECOMPOSE" || status === "AMBER"
          ? "chip-warn"
          : "chip-neutral";
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${tone}`}>
      {statusLabel(status)}
    </span>
  );
}

export function Stamp({
  label,
  tone = "navy",
}: {
  label: string;
  tone?: "danger" | "navy" | "ok" | "warn";
}) {
  return <span className={`stamp stamp-${tone}`}>{label}</span>;
}

export function ExplanationPanel({
  title,
  summary,
  steps,
}: {
  title: string;
  summary: string;
  steps: string[];
}) {
  return (
    <details className="rounded-lg border border-[var(--line)] bg-[var(--panel-2)] p-3">
      <summary className="cursor-pointer text-sm font-medium">
        How was this calculated? {title}
        <span className="ml-2 text-[var(--muted)]">{summary}</span>
      </summary>
      <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-[var(--muted)]">
        {steps.map((step, i) => (
          <li key={`${i}-${step}`}>{step}</li>
        ))}
      </ol>
    </details>
  );
}

/** Canonical release rendering: year-only "2026-" shows as "2026" (with a hint); "2026-Q3" as-is. */
export function Release({ value }: { value?: string | null }) {
  const raw = String(value ?? "").trim();
  if (!raw) return <span className="text-[var(--muted)]">—</span>;
  const yearOnly = /^\d{4}-?$/.test(raw);
  const label = raw.endsWith("-") ? raw.slice(0, -1) : raw;
  return yearOnly ? (
    <span title="Release year set; quarter not yet decided">{label}</span>
  ) : (
    <span>{label}</span>
  );
}
