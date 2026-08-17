"use client";

export function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "APPROVED" || status === "READY" || status === "HIGH" || status === "High" || status === "PLAN"
      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
      : status.includes("REQUIRED") || status === "REJECTED" || status === "SPLIT" || status === "LOW" || status === "Low" || status === "Very Low" || status === "SPLIT EPIC"
        ? "bg-rose-50 text-rose-800 border-rose-200"
        : status === "REVIEW" || status === "REVIEWED" || status === "MEDIUM" || status === "DECOMPOSE" || status === "AMBER"
          ? "bg-amber-50 text-amber-900 border-amber-200"
          : "bg-slate-100 text-slate-700 border-slate-200";
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${tone}`}>
      {status.replaceAll("_", " ")}
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
        {steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
    </details>
  );
}
