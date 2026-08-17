"use client";

export function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "APPROVED" || status === "READY" || status === "HIGH" || status === "High"
      ? "bg-emerald-500/15 text-emerald-300"
      : status.includes("REQUIRED") || status === "REJECTED" || status === "SPLIT" || status === "LOW" || status === "Low" || status === "Very Low"
        ? "bg-rose-500/15 text-rose-300"
        : status === "REVIEW" || status === "REVIEWED" || status === "MEDIUM" || status === "DECOMPOSE"
          ? "bg-amber-500/15 text-amber-200"
          : "bg-slate-500/20 text-slate-200";
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${tone}`}>
      {status.replaceAll("_", " ")}
    </span>
  );
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
    <details className="rounded-xl border border-[var(--line)] bg-[var(--panel-2)] p-3">
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
