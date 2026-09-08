"use client";

import Link from "next/link";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

/**
 * Decision-aligned visuals for queue roles (Reviewer / Approver). These roles see only a SLICE of the
 * lifecycle (their queue + what they cleared), so a full pipeline funnel / by-status view would be
 * structurally empty and misleading. Instead we show what actually informs their decisions: how long
 * items have waited, throughput, and the readiness / confidence / governance-flags / volume of the
 * work they act on. Makers and pod leads reuse HomeDashboard (full lifecycle) — not this.
 */

const TT = { background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 10, color: "var(--text)" };
const confColor: Record<string, string> = { High: "#10b981", Medium: "#0f766e", Low: "#e0a458", "Very Low": "#e05c5c" };
const ACTIONISH = new Set(["SPLIT", "SPLIT EPIC", "SPIKE REQUIRED", "DISCOVERY REQUIRED", "DECOMPOSE", "REJECTED"]);

function Rule() {
  return <hr className="mb-3 h-0.5 w-8 rounded-full border-0 bg-[linear-gradient(90deg,var(--gold-2),var(--gold))]" />;
}
function Card({ children }: { children: React.ReactNode }) {
  return <section className="card flex flex-col p-5">{children}</section>;
}
function H({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <div className="mb-1">
      <h3 className="font-display text-base font-semibold text-[var(--navy)]">{children}</h3>
      {sub ? <p className="text-xs text-[var(--muted)]">{sub}</p> : null}
    </div>
  );
}

export type PersonalInsightsData = {
  aging: { label: string; count: number }[];
  throughput: { period: string; value: number }[];
  throughputLabel: string;
  avgReadiness: number;
  byConfidence: { name: string; count: number }[];
  byFlag: { name: string; count: number }[];
  byTeam: { name: string; count: number }[];
  attention: { id: string; reference: string; title: string; tag: string }[];
};

export function PersonalInsights({
  aging, throughput, throughputLabel, avgReadiness, byConfidence, byFlag, byTeam, attention,
}: PersonalInsightsData) {
  const agingMax = Math.max(1, ...aging.map((a) => a.count));
  const agingTotal = aging.reduce((s, a) => s + a.count, 0);
  const agingColor = ["#10b981", "#e0a458", "#e0742e", "#e05c5c"]; // older buckets shade warmer
  const hasThroughput = throughput.some((t) => t.value > 0);
  const dorPct = Math.round((avgReadiness / 5) * 100);
  const confTotal = Math.max(1, byConfidence.reduce((s, r) => s + r.count, 0));
  const flagMax = Math.max(1, ...byFlag.map((f) => f.count));
  const teamMax = Math.max(1, ...byTeam.map((t) => t.count));

  return (
    <div className="space-y-4">
      {/* Waiting time + throughput */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <Rule />
          <H sub="How long items have waited for you">Waiting time</H>
          <div className="mt-3 flex flex-1 flex-col justify-center gap-3">
            {agingTotal === 0 ? (
              <p className="py-8 text-center text-sm text-[var(--muted)]">Nothing waiting. 🎉</p>
            ) : (
              aging.map((a, i) => (
                <div key={a.label} className="grid grid-cols-[52px_1fr_28px] items-center gap-2 text-sm">
                  <span className="text-[var(--muted)]">{a.label}</span>
                  <span className="h-2.5 rounded bg-[var(--panel-2)]">
                    <span className="block h-full rounded" style={{ width: `${(a.count / agingMax) * 100}%`, background: agingColor[i] ?? "#e05c5c" }} />
                  </span>
                  <span className="text-right font-bold tabular-nums">{a.count}</span>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card>
          <Rule />
          <H sub={`${throughputLabel} · 6 months`}>Throughput</H>
          <div className="mt-2 min-h-[11rem] flex-1">
            {hasThroughput ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={throughput} margin={{ top: 16, right: 6, left: -18, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
                  <XAxis dataKey="period" tick={{ fill: "var(--muted)", fontSize: 10 }} axisLine={{ stroke: "var(--line)" }} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fill: "var(--muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={TT} formatter={(v) => [`${v}`, throughputLabel]} />
                  <Line type="monotone" dataKey="value" name={throughputLabel} stroke="#10b981" strokeWidth={2.5} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="pt-14 text-center text-sm text-[var(--muted)]">No {throughputLabel.toLowerCase()} activity in the last 6 months yet.</p>
            )}
          </div>
        </Card>
      </div>

      {/* Definition of Ready + confidence + governance decision mix */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <Rule />
          <H sub="Readiness of what you act on">Definition of Ready</H>
          <div className="flex flex-1 flex-col items-center justify-center gap-1">
            <svg viewBox="0 0 120 74" className="h-28">
              <path d="M10 66 A50 50 0 0 1 110 66" fill="none" stroke="var(--panel-2)" strokeWidth="12" strokeLinecap="round" />
              <path
                d="M10 66 A50 50 0 0 1 110 66" fill="none" strokeWidth="12" strokeLinecap="round"
                stroke={dorPct >= 80 ? "#10b981" : dorPct >= 50 ? "#e0a458" : "#e05c5c"}
                strokeDasharray={`${(dorPct / 100) * 157} 999`}
              />
              <text x="60" y="58" textAnchor="middle" fontSize="22" fontWeight="700" fill="var(--navy)">{dorPct}%</text>
            </svg>
            <p className="text-xs text-[var(--muted)]">Avg readiness {avgReadiness.toFixed(1)} / 5</p>
          </div>
        </Card>

        <Card>
          <Rule />
          <H sub="Estimate certainty spread">Confidence mix</H>
          <div className="flex flex-1 flex-col justify-center">
            <div className="flex h-6 overflow-hidden rounded-md">
              {["High", "Medium", "Low", "Very Low"].map((k) => {
                const n = byConfidence.find((c) => c.name === k)?.count ?? 0;
                return n > 0 ? <span key={k} style={{ width: `${(n / confTotal) * 100}%`, background: confColor[k] }} /> : null;
              })}
            </div>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--muted)]">
              {["High", "Medium", "Low", "Very Low"].map((k) => {
                const n = byConfidence.find((c) => c.name === k)?.count ?? 0;
                return (
                  <span key={k} className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: confColor[k] }} />
                    {k} {n}
                  </span>
                );
              })}
            </div>
          </div>
        </Card>

        <Card>
          <Rule />
          <H sub="What the engine flagged on these">Decision mix</H>
          <div className="mt-3 flex flex-1 flex-col justify-center gap-2.5">
            {byFlag.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">Nothing flagged.</p>
            ) : (
              byFlag.slice(0, 6).map((f) => {
                const needsAction = ACTIONISH.has(f.name);
                return (
                  <div key={f.name} className="grid grid-cols-[120px_1fr_28px] items-center gap-2 text-sm">
                    <span className="leading-tight text-[var(--muted)]">{f.name}</span>
                    <span className="h-2 rounded bg-[var(--panel-2)]">
                      <span className="block h-full rounded" style={{ width: `${(f.count / flagMax) * 100}%`, background: needsAction ? "#e05c5c" : "#10b981" }} />
                    </span>
                    <span className="text-right font-bold tabular-nums">{f.count}</span>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </div>

      {/* Volume by team + needs attention */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <Rule />
          <H sub="Which pods your work comes from">Volume by team</H>
          <div className="mt-3 flex flex-1 flex-col justify-center gap-2.5">
            {byTeam.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">Nothing in scope yet.</p>
            ) : (
              byTeam.slice(0, 6).map((t) => (
                <div key={t.name} className="grid grid-cols-[120px_1fr_28px] items-center gap-2 text-sm">
                  <span className="truncate text-[var(--muted)]" title={t.name}>{t.name}</span>
                  <span className="h-2 rounded bg-[var(--panel-2)]">
                    <span className="block h-full rounded bg-[var(--gold)]" style={{ width: `${(t.count / teamMax) * 100}%` }} />
                  </span>
                  <span className="text-right font-bold tabular-nums">{t.count}</span>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card>
          <Rule />
          <H sub="What to look at now">Needs attention</H>
          <div className="mt-2 flex flex-col">
            {attention.length === 0 ? (
              <p className="py-6 text-center text-sm text-[var(--muted)]">Nothing flagged. 🎉</p>
            ) : (
              attention.map((a) => (
                <Link key={a.id} href={`/estimates/${a.id}`} className="flex items-center gap-2.5 border-t border-[var(--line)] py-2.5 text-sm first:border-0 hover:bg-[var(--panel-2)]">
                  <span
                    className="shrink-0 rounded-full px-2 py-0.5 text-[0.62rem] font-bold"
                    style={{ color: ACTIONISH.has(a.tag) ? "var(--danger)" : "var(--warn)", background: "color-mix(in srgb, currentColor 12%, transparent)" }}
                  >
                    {a.tag}
                  </span>
                  <span className="font-semibold text-[var(--navy)]">{a.reference}</span>
                  <span className="ml-auto max-w-[9rem] truncate text-xs text-[var(--muted)]">{a.title}</span>
                </Link>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
