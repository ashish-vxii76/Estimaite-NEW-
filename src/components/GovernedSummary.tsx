"use client";

import { ExplanationPanel, Stamp } from "@/components/ui";
import { formatMoney } from "@/lib/utils";
import type { EstimateCalculationResult } from "@/domain/estimation/types";

function stampTone(flag: string): "danger" | "navy" | "ok" | "warn" {
  if (flag.includes("REQUIRED") || flag === "SPLIT" || flag === "SPLIT EPIC") return "danger";
  if (flag === "REVIEW" || flag === "DECOMPOSE") return "warn";
  if (flag === "READY" || flag === "PLAN") return "ok";
  return "navy";
}

export function GovernedSummary({
  result,
  previewIndex,
  reference,
  title,
}: {
  result: EstimateCalculationResult | null;
  previewIndex: number;
  reference: string;
  title: string;
}) {
  const deferred = result?.costApplicability && result.costApplicability !== "OK";

  return (
    <aside className="card sticky top-4 space-y-4 p-5">
      <div>
        <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Governed estimate</p>
        <p className="mt-1 text-sm font-medium text-[var(--navy)]">
          {reference}
          {title ? ` · ${title}` : ""}
        </p>
      </div>

      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs text-[var(--muted)]">T-shirt</p>
          <p className="text-5xl font-semibold leading-none text-[var(--navy)]">
            {result?.effectiveTshirt ?? "—"}
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Index {result?.complexityIndex ?? previewIndex}
            {result ? ` · assessed ${result.assessedTshirt}` : " (live)"}
          </p>
        </div>
        {result ? (
          <div className="flex flex-col items-end gap-3">
            <Stamp label={result.deliveryFlag} tone={stampTone(result.deliveryFlag)} />
            {result.governanceDecision !== result.deliveryFlag ? (
              <Stamp label={result.governanceDecision} tone="navy" />
            ) : null}
          </div>
        ) : (
          <p className="max-w-[9rem] text-right text-xs text-[var(--muted)]">
            Calculate to stamp the delivery flag.
          </p>
        )}
      </div>

      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-xs text-[var(--muted)]">Story points</dt>
          <dd className="font-semibold">
            {result ? `${result.selectedSp} · Dev ${result.devSp} / QA ${result.qaSp}` : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-[var(--muted)]">Sprints</dt>
          <dd className="font-semibold">{result?.finalSprints ?? "—"}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-xs text-[var(--muted)]">AI-adjusted cost</dt>
          <dd className="text-lg font-semibold text-[var(--navy)]">
            {deferred ? (
              <span className="text-sm font-medium text-[var(--warn)]">
                COST DEFERRED — ROM Epic; cost at Story level
              </span>
            ) : (
              <>
                {formatMoney(result?.aiAdjustedDeliveryCost ?? null, result?.currency ?? "CHF")}
                {result?.costP50 != null && result?.costP80 != null ? (
                  <span
                    className="mt-0.5 block text-xs font-normal text-[var(--muted)]"
                    title="Confidence range: P50 is the coin-flip cost; P80 is the 80%-confident safe budget."
                  >
                    P50 {formatMoney(result.costP50, result.currency ?? "CHF")} · P80{" "}
                    {formatMoney(result.costP80, result.currency ?? "CHF")}
                  </span>
                ) : null}
              </>
            )}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-[var(--muted)]">Confidence</dt>
          <dd className="font-medium">{result?.confidence ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs text-[var(--muted)]">DoR</dt>
          <dd className="font-medium">
            {result ? `${result.readinessScore}/5 · ${result.dorStatus}` : "—"}
          </dd>
        </div>
      </dl>

      {result?.epicSummary ? (
        <p className="rounded-lg border border-dashed border-[var(--line)] bg-[var(--panel-2)] p-3 text-sm">
          {result.epicSummary}
        </p>
      ) : null}

      {result ? (
        <div className="space-y-2">
          {Object.values(result.explanations)
            .slice(0, 4)
            .map((ex) => (
              <ExplanationPanel key={ex.title} {...ex} />
            ))}
        </div>
      ) : (
        <p className="text-xs text-[var(--muted)]">How was this calculated? appears after you calculate.</p>
      )}
    </aside>
  );
}
