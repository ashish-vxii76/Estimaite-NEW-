"use client";

import {
  Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { formatMoney } from "@/lib/utils";

const TT = { background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 10, color: "var(--text)" };

function Rule() {
  return <hr className="mb-3 h-0.5 w-8 rounded-full border-0 bg-[linear-gradient(90deg,var(--gold-2),var(--gold))]" />;
}
function Card({ children }: { children: React.ReactNode }) {
  return <section className="card p-5">{children}</section>;
}
function H({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <div className="mb-1">
      <h3 className="font-display text-base font-semibold text-[var(--navy)]">{children}</h3>
      {sub ? <p className="text-xs text-[var(--muted)]">{sub}</p> : null}
    </div>
  );
}

export function RollupCharts({
  currency, budget, utilised, projected, forecast, burnUp, baseline, aiAdjusted, variance, costByCrew,
}: {
  currency: string;
  budget: number | null;
  utilised: number;
  projected: number;
  forecast: number;
  burnUp: { quarter: string; committed: number; cumulative: number }[];
  baseline: number;
  aiAdjusted: number;
  variance: {
    sampleCount: number;
    variancePct: number | null;
    byCrew: { crewName: string; variancePct: number | null }[];
  };
  costByCrew: { crewName: string; cost: number }[];
}) {
  const TREE = ["#0f766e", "#b08d57", "#3b82f6", "#e0a458", "#8b7bb8", "#10b981", "#e05c5c"];
  const costTotal = Math.max(1, costByCrew.reduce((s, c) => s + c.cost, 0));
  const money = (n: number | null) => (n == null ? "—" : formatMoney(n, currency));

  // Budget bullet scale
  const b = budget ?? 0;
  const scaleMax = Math.max(b * 1.15, projected * 1.05, 1);
  const pct = (n: number) => `${Math.min(100, (n / scaleMax) * 100)}%`;
  const baseMax = Math.max(baseline, aiAdjusted, 1);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Budget bullet */}
        <Card>
          <Rule />
          <H sub="Committed & forecast against the crew budget">Budget vs utilisation</H>
          {budget == null ? (
            <p className="mt-4 text-sm text-[var(--muted)]">No crew budget set for this scope.</p>
          ) : (
            <>
              <div
                className="relative mt-5 h-7 rounded-lg border border-[var(--line)]"
                style={{ background: `linear-gradient(90deg, var(--ok-soft, rgba(16,160,106,.16)) 0 ${(b / scaleMax) * 100}%, rgba(224,164,88,.2) ${(b / scaleMax) * 100}% ${(b * 1.1 / scaleMax) * 100}%, rgba(209,84,79,.2) ${(b * 1.1 / scaleMax) * 100}% 100%)` }}
              >
                <div className="absolute inset-y-1.5 left-0 rounded bg-[var(--teal)]" style={{ width: pct(utilised) }} />
                <div className="absolute inset-y-0.5 w-[3px] bg-[var(--navy)] opacity-60" style={{ left: pct(projected) }} title="Projected" />
                <div className="absolute -inset-y-1 w-[2px] bg-[var(--danger)]" style={{ left: `${(b / scaleMax) * 100}%` }} title="Budget" />
              </div>
              <div className="mt-2 flex justify-between text-[0.68rem] text-[var(--muted)]">
                <span>0</span>
                <span>Utilised {money(utilised)}</span>
                <span>Forecast {money(projected)}</span>
                <span className="tabular-nums">{money(budget)}</span>
              </div>
              <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
                <div><p className="text-[0.66rem] uppercase tracking-wide text-[var(--muted)]">Remaining</p><p className="text-lg font-semibold tabular-nums">{money(budget - utilised)}</p></div>
                <div><p className="text-[0.66rem] uppercase tracking-wide text-[var(--muted)]">In-pipeline</p><p className="text-lg font-semibold tabular-nums">{money(forecast)}</p></div>
              </div>
            </>
          )}
        </Card>

        {/* Burn-up */}
        <Card>
          <Rule />
          <H sub="Cumulative committed spend across quarters">Budget burn-up</H>
          <div className="mt-2 h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={burnUp} margin={{ top: 18, right: 10, left: -12, bottom: 0 }}>
                <defs><linearGradient id="burn" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--teal)" stopOpacity={0.35} /><stop offset="100%" stopColor="var(--teal)" stopOpacity={0.02} /></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
                <XAxis dataKey="quarter" tick={{ fill: "var(--muted)", fontSize: 11 }} axisLine={{ stroke: "var(--line)" }} tickLine={false} />
                <YAxis tick={{ fill: "var(--muted)", fontSize: 10 }} axisLine={false} tickLine={false} width={48} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                <Tooltip contentStyle={TT} formatter={(v) => [formatMoney(Number(v), currency), "Cumulative"] as [string, string]} />
                {budget != null ? <ReferenceLine y={budget} stroke="var(--danger)" strokeDasharray="4 3" label={{ value: `Budget ${Math.round(budget / 1000)}k`, position: "insideTopRight", fill: "var(--danger)", fontSize: 10 }} /> : null}
                <Area type="monotone" dataKey="cumulative" stroke="var(--teal)" strokeWidth={2.5} fill="url(#burn)" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Baseline vs AI */}
        <Card>
          <Rule />
          <H sub="What the AI productivity model saves (pipeline)">Baseline vs AI-adjusted</H>
          <div className="mt-4 flex flex-col gap-3">
            <div className="grid grid-cols-[96px_1fr_auto] items-center gap-3 text-sm">
              <span className="text-[var(--muted)]">Baseline</span>
              <span className="h-4 rounded bg-[var(--panel-2)]"><span className="block h-full rounded bg-[var(--faint,#918a78)]" style={{ width: `${(baseline / baseMax) * 100}%`, background: "var(--muted)" }} /></span>
              <span className="text-right font-bold tabular-nums">{money(baseline)}</span>
            </div>
            <div className="grid grid-cols-[96px_1fr_auto] items-center gap-3 text-sm">
              <span className="text-[var(--muted)]">AI-adjusted</span>
              <span className="h-4 rounded bg-[var(--panel-2)]"><span className="block h-full rounded bg-[var(--teal)]" style={{ width: `${(aiAdjusted / baseMax) * 100}%` }} /></span>
              <span className="text-right font-bold tabular-nums">{money(aiAdjusted)}</span>
            </div>
          </div>
          <p className="mt-3 text-xs text-[var(--muted)]">
            Saving {money(Math.max(0, baseline - aiAdjusted))}
            {baseline > 0 ? ` · ${(((baseline - aiAdjusted) / baseline) * 100).toFixed(1)}%` : ""}
          </p>
        </Card>

        {/* Delivery variance by crew */}
        <Card>
          <Rule />
          <H sub={`${variance.sampleCount} completed CRs${variance.variancePct != null ? ` · overall ${variance.variancePct > 0 ? "+" : ""}${(variance.variancePct * 100).toFixed(1)}%` : ""}`}>Delivery variance by crew</H>
          {variance.byCrew.length === 0 ? (
            <p className="mt-4 text-sm text-[var(--muted)]">No completed CRs with actuals in this scope yet.</p>
          ) : (
            <div className="relative mt-4">
              <div className="absolute inset-y-0 left-1/2 w-px bg-[var(--line)]" />
              <div className="flex flex-col gap-3">
                {variance.byCrew.map((c) => {
                  const p = c.variancePct ?? 0;
                  const over = p > 0;
                  const w = Math.min(48, Math.abs(p) * 100 * 1.4);
                  return (
                    <div key={c.crewName} className="flex items-center gap-2 text-sm">
                      <span className="w-16 truncate text-[var(--muted)]">{c.crewName}</span>
                      <div className="flex flex-1 items-center">
                        <div className="flex w-1/2 justify-end">{!over ? <span className="h-3 rounded bg-[var(--ok)]" style={{ width: `${w}%` }} /> : null}</div>
                        <div className="flex w-1/2">{over ? <span className="h-3 rounded" style={{ width: `${w}%`, background: p > 0.15 ? "var(--danger)" : "var(--warn)" }} /> : null}</div>
                      </div>
                      <span className={`w-14 text-right font-bold tabular-nums ${over ? (p > 0.15 ? "text-[var(--danger)]" : "text-[var(--warn)]") : "text-[var(--ok)]"}`}>
                        {c.variancePct == null ? "—" : `${over ? "+" : ""}${(p * 100).toFixed(1)}%`}
                      </span>
                    </div>
                  );
                })}
              </div>
              <p className="mt-3 text-xs text-[var(--muted)]">Left = under estimate (green) · right = over (amber/red)</p>
            </div>
          )}
        </Card>
      </div>

      {costByCrew.length > 0 ? (
        <Card>
          <Rule />
          <H sub="Committed AI-adjusted spend, proportional by crew">Cost concentration</H>
          <div className="mt-4 flex h-32 gap-1.5 overflow-hidden">
            {costByCrew.map((c, i) => {
              const share = c.cost / costTotal;
              return (
                <div
                  key={c.crewName}
                  className="flex min-w-[70px] flex-col justify-end rounded-lg p-2.5 text-white"
                  style={{ flex: `${Math.max(0.4, share)} 1 0`, background: TREE[i % TREE.length] }}
                  title={`${c.crewName} · ${formatMoney(c.cost, currency)}`}
                >
                  <span className="truncate text-xs font-bold">{c.crewName}</span>
                  <span className="text-[0.7rem] opacity-90">{Math.round(share * 100)}%</span>
                </div>
              );
            })}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
