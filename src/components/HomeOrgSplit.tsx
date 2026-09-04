import Link from "next/link";
import { formatMoney } from "@/lib/utils";

export type OrgSplitMoney = {
  utilizationPct: number | null;
  utilised: number;
  budget: number | null;
  currency: string;
  variancePct: number | null;
  rag: string;
};

export type OrgSplitRow = {
  id: string;
  name: string;
  total: number;
  drafts: number;
  inReview: number;
  approved: number;
  completed: number;
  avgReadiness: number;
  needsAction: number;
  money: OrgSplitMoney | null;
};

const RAG_TEXT: Record<string, string> = {
  GREEN: "var(--ok)",
  AMBER: "var(--warn)",
  RED: "var(--danger)",
  UNSET: "var(--muted)",
};

const RAG_BAR: Record<string, string> = {
  GREEN: "#10b981",
  AMBER: "#e0a458",
  RED: "#e05c5c",
  UNSET: "#94a3b8",
};

const RAG_LABEL: Record<string, string> = {
  GREEN: "On budget",
  AMBER: "Watch",
  RED: "Over",
  UNSET: "No budget",
};

/** "Company" → "Companies", "Stream" → "Streams", etc. */
function pluralize(label: string) {
  return label.endsWith("y") ? `${label.slice(0, -1)}ies` : `${label}s`;
}

const SEGMENTS = [
  { key: "drafts" as const, label: "Draft", color: "#94a3b8" },
  { key: "inReview" as const, label: "In review", color: "#3b82f6" },
  { key: "approved" as const, label: "Approved", color: "#e0a458" },
  { key: "completed" as const, label: "Completed", color: "#10b981" },
];

/** Proportional status bar for one org row, sized to the widest org so bars are comparable. */
function StatusBar({ row, scaleMax }: { row: OrgSplitRow; scaleMax: number }) {
  const widthPct = scaleMax > 0 ? (row.total / scaleMax) * 100 : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="h-3 flex-1 overflow-hidden rounded-full bg-[var(--panel-2)]">
        <div className="flex h-full" style={{ width: `${widthPct}%` }}>
          {SEGMENTS.map((s) => {
            const v = row[s.key];
            if (!v) return null;
            const seg = (v / row.total) * 100;
            return (
              <span
                key={s.key}
                title={`${s.label}: ${v}`}
                style={{ width: `${seg}%`, backgroundColor: s.color }}
              />
            );
          })}
        </div>
      </div>
      <span
        className="w-8 text-right text-sm font-semibold tabular-nums text-[var(--navy)]"
        title="Total estimates (CRs) for this row"
      >
        {row.total}
      </span>
    </div>
  );
}

/**
 * Cross-organization comparison for the home dashboard. Renders only when the viewer can
 * see more than one org at the split level. Volume + workflow measures are aggregated
 * across orgs; money is shown per-row in its own currency and never summed across
 * currencies (budgets are single-currency today; multi-currency + FX is a separate change).
 */
export function HomeOrgSplit({
  splitLabel,
  rows,
}: {
  splitLabel: string;
  rows: OrgSplitRow[];
}) {
  const scaleMax = Math.max(1, ...rows.map((r) => r.total));
  const totals = rows.reduce(
    (a, r) => ({
      total: a.total + r.total,
      needsAction: a.needsAction + r.needsAction,
    }),
    { total: 0, needsAction: 0 },
  );
  // Overall budget RAG rollup — counts per health band, currency-agnostic (works across USD/GBP/CHF).
  const ragCount = rows.reduce(
    (a, r) => {
      const k = r.money?.rag ?? "UNSET";
      a[k] = (a[k] ?? 0) + 1;
      return a;
    },
    {} as Record<string, number>,
  );
  const ragOrder = ["GREEN", "AMBER", "RED"] as const;

  return (
    <section className="card p-5">
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <div>
          <span className="mb-2 block h-0.5 w-8 rounded-full bg-[linear-gradient(90deg,var(--gold-2),var(--gold))]" />
          <h3 className="font-display text-base font-semibold text-[var(--navy)]">
            By {splitLabel.toLowerCase()}
          </h3>
          <p className="text-xs text-[var(--muted)]">
            {rows.length}{" "}
            {(rows.length === 1 ? splitLabel : pluralize(splitLabel)).toLowerCase()} in view ·
            select a row to focus the dashboard
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.72rem] text-[var(--muted)]">
            <span className="font-semibold uppercase tracking-[0.1em] text-[0.62rem]">Budget health</span>
            {ragOrder.map((k) =>
              ragCount[k] ? (
                <span key={k} className="inline-flex items-center gap-1">
                  <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: RAG_BAR[k] }} />
                  {ragCount[k]} {RAG_LABEL[k].toLowerCase()}
                </span>
              ) : null,
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.7rem] text-[var(--muted)]">
          {SEGMENTS.map((s) => (
            <span key={s.key} className="inline-flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-sm" style={{ backgroundColor: s.color }} />
              {s.label}
            </span>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-[var(--line)] text-left text-[0.66rem] uppercase tracking-[0.12em] text-[var(--muted)]">
              <th className="py-2 pr-3 font-semibold">{splitLabel}</th>
              <th className="py-2 pr-3 font-semibold">Estimates by status</th>
              <th className="py-2 pr-3 text-right font-semibold">Readiness</th>
              <th className="py-2 pr-3 text-right font-semibold">Needs action</th>
              <th className="py-2 pr-3 text-right font-semibold">Budget used</th>
              <th className="py-2 pr-0 text-right font-semibold">Variance</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const m = r.money;
              const utilColor = m ? RAG_TEXT[m.rag] ?? "var(--navy)" : "var(--muted)";
              // utilizationPct / variancePct are fractions (0.33 = 33%).
              const varColor =
                m?.variancePct == null
                  ? "var(--muted)"
                  : m.variancePct > 0.05
                    ? "var(--danger)"
                    : m.variancePct < -0.05
                      ? "var(--ok)"
                      : "var(--navy)";
              return (
                <tr key={r.id} className="border-b border-[var(--line)] align-middle">
                  <td className="py-2.5 pr-3">
                    <span className="inline-flex items-center gap-2">
                      <span
                        className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: m ? RAG_BAR[m.rag] ?? RAG_BAR.UNSET : RAG_BAR.UNSET }}
                        title={m ? RAG_LABEL[m.rag] ?? RAG_LABEL.UNSET : RAG_LABEL.UNSET}
                      />
                      <Link
                        href={`/home?org=${r.id}`}
                        className="font-medium text-[var(--navy)] underline-offset-2 hover:underline"
                      >
                        {r.name}
                      </Link>
                    </span>
                  </td>
                  <td className="w-[36%] min-w-[220px] py-2.5 pr-3">
                    <StatusBar row={r} scaleMax={scaleMax} />
                  </td>
                  <td className="py-2.5 pr-3">
                    {r.total > 0 && r.avgReadiness > 0 ? (
                      <div className="flex items-center justify-end gap-2">
                        <span className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-[var(--panel-2)] sm:block">
                          <span
                            className="block h-full rounded-full"
                            style={{
                              width: `${(r.avgReadiness / 5) * 100}%`,
                              backgroundColor: r.avgReadiness >= 4 ? "#10b981" : r.avgReadiness >= 3 ? "#e0a458" : "#e05c5c",
                            }}
                          />
                        </span>
                        <span className="w-8 text-right tabular-nums text-[var(--navy)]">{r.avgReadiness.toFixed(1)}</span>
                      </div>
                    ) : (
                      <span className="block text-right text-[var(--muted)]">—</span>
                    )}
                  </td>
                  <td className="py-2.5 pr-3 text-right tabular-nums">
                    {r.needsAction > 0 ? (
                      <span className="chip chip-warn">{r.needsAction}</span>
                    ) : (
                      <span className="text-[var(--muted)]">0</span>
                    )}
                  </td>
                  <td className="py-2.5 pr-3">
                    {m && m.utilizationPct != null ? (
                      <div
                        className="flex items-center justify-end gap-2"
                        title={`${formatMoney(m.utilised, m.currency)} of ${formatMoney(m.budget, m.currency)}`}
                      >
                        <span className="hidden h-1.5 w-24 overflow-hidden rounded-full bg-[var(--panel-2)] sm:block">
                          <span
                            className="block h-full rounded-full"
                            style={{
                              width: `${Math.min(100, Math.round(m.utilizationPct * 100))}%`,
                              backgroundColor: RAG_BAR[m.rag] ?? RAG_BAR.UNSET,
                            }}
                          />
                        </span>
                        <span className="w-10 text-right tabular-nums" style={{ color: utilColor }}>
                          {Math.round(m.utilizationPct * 100)}%
                        </span>
                      </div>
                    ) : (
                      <span className="block text-right text-[var(--muted)]">—</span>
                    )}
                  </td>
                  <td className="py-2.5 pr-0 text-right tabular-nums" style={{ color: varColor }}>
                    {m?.variancePct != null ? `${m.variancePct > 0 ? "+" : ""}${Math.round(m.variancePct * 100)}%` : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="text-[0.72rem] text-[var(--muted)]">
              <td className="pt-2 pr-3 font-semibold uppercase tracking-[0.1em]">All in view</td>
              <td className="pt-2 pr-3 text-[var(--navy)]">
                <span className="font-semibold tabular-nums">{totals.total}</span> estimates
              </td>
              <td className="pt-2 pr-3" />
              <td className="pt-2 pr-3 text-right tabular-nums text-[var(--navy)]">
                {totals.needsAction}
              </td>
              <td className="pt-2 pr-3 text-right" colSpan={2}>
                money shown per {splitLabel.toLowerCase()} — not summed across currencies
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}
