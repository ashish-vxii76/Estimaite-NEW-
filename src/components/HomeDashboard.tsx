"use client";

import Link from "next/link";
import {
  CartesianGrid, Cell, Label, Legend, Line, LineChart,
  Pie, PieChart, ResponsiveContainer, Tooltip, Treemap, XAxis, YAxis,
} from "recharts";
import { formatMoney } from "@/lib/utils";

const STATUS_COLORS = ["#0f766e", "#b08d57", "#3b82f6", "#e0a458", "#e05c5c", "#10b981", "#8b7bb8"];
const TT = { background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 10, color: "var(--text)" };

type Named = { name: string; count: number };
type Health = {
  budgetRag: string; budgetLabel: string; utilizationPct: number | null; currency: string;
  utilised: number; budget: number | null; deliveryVariancePct: number | null; needsAction: number; year: number;
};

const RAG_TEXT: Record<string, string> = { GREEN: "var(--ok)", AMBER: "var(--warn)", RED: "var(--danger)", UNSET: "var(--muted)" };
const RAG_BAR: Record<string, string> = { GREEN: "#10b981", AMBER: "#e0a458", RED: "#e05c5c", UNSET: "#94a3b8" };

function Rule() {
  return <hr className="mb-3 h-0.5 w-8 rounded-full border-0 bg-[linear-gradient(90deg,var(--gold-2),var(--gold))]" />;
}
function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`card flex flex-col p-5 ${className}`}>{children}</section>;
}
function H({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <div className="mb-1">
      <h3 className="font-display text-base font-semibold text-[var(--navy)]">{children}</h3>
      {sub ? <p className="text-xs text-[var(--muted)]">{sub}</p> : null}
    </div>
  );
}

/** Tiny sparkline from a numeric series. */
function Spark({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(1, ...data);
  const pts = data
    .map((v, i) => `${(i / Math.max(1, data.length - 1)) * 120},${34 - (v / max) * 30 - 2}`)
    .join(" ");
  return (
    <svg viewBox="0 0 120 34" preserveAspectRatio="none" className="mt-2 h-8 w-full">
      <polyline fill="none" stroke={color} strokeWidth="2" points={pts} />
    </svg>
  );
}

/** Interpolate #rrggbb hex a→b at t∈[0,1] → rgb() string. */
function lerpHex(a: string, b: string, t: number) {
  const ah = parseInt(a.slice(1), 16);
  const bh = parseInt(b.slice(1), 16);
  const r = Math.round(((ah >> 16) & 255) + (((bh >> 16) & 255) - ((ah >> 16) & 255)) * t);
  const g = Math.round(((ah >> 8) & 255) + (((bh >> 8) & 255) - ((ah >> 8) & 255)) * t);
  const bl = Math.round((ah & 255) + ((bh & 255) - (ah & 255)) * t);
  return `rgb(${r},${g},${bl})`;
}

/** One treemap tile for a pod: area = load, colour deepens with load, label if it fits. */
function TeamTile(props: {
  x?: number; y?: number; width?: number; height?: number;
  name?: string; value?: number; colorMax?: number;
}) {
  const { x = 0, y = 0, width = 0, height = 0, name = "", value = 0, colorMax = 1 } = props;
  if (width <= 0 || height <= 0) return null;
  const t = colorMax > 0 ? value / colorMax : 0;
  const fill = lerpHex("#d8be86", "#8a6a2c", t); // light gold (low load) → deep gold (high load)
  const showName = width > 52 && height > 24;
  const showValue = width > 40 && height > 40;
  return (
    <g>
      <rect x={x + 1} y={y + 1} width={width - 2} height={height - 2} rx={6} fill={fill} stroke="var(--panel)" strokeWidth={2} />
      {showName && (
        <text x={x + 9} y={y + 18} fontSize={11} fontWeight={600} fill="#1c2433" style={{ pointerEvents: "none" }}>
          {name}
        </text>
      )}
      {showValue && (
        <text x={x + 9} y={y + 36} fontSize={15} fontWeight={800} fill="#1c2433" style={{ pointerEvents: "none" }}>
          {value}
        </text>
      )}
    </g>
  );
}

function Kpi({ label, value, series, color }: { label: string; value: number; series: number[]; color: string }) {
  const delta = series.length >= 2 ? series[series.length - 1] - series[series.length - 2] : 0;
  const cls = delta > 0 ? "text-[var(--ok)]" : delta < 0 ? "text-[var(--danger)]" : "text-[var(--muted)]";
  const sign = delta > 0 ? "▲" : delta < 0 ? "▼" : "—";
  return (
    <div className="card card-interactive overflow-hidden p-4">
      <span className="mb-2 block h-0.5 w-8 rounded-full bg-[linear-gradient(90deg,var(--gold-2),var(--gold))]" />
      <p className="text-[0.66rem] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">{label}</p>
      <div className="mt-1 flex items-end justify-between gap-2">
        <p className="text-3xl font-semibold tabular-nums text-[var(--navy)]">{value}</p>
        <span className={`text-xs font-bold ${cls}`}>{sign} {Math.abs(delta)}</span>
      </div>
      <Spark data={series} color={color} />
    </div>
  );
}

export function HomeDashboard({
  counts, byStatus, byTeam, byFlag, byConfidence, avgReadiness, spark, trend, attention, health,
  showBudget = true,
}: {
  counts: { total: number; drafts: number; inReview: number; approved: number; completed: number; reviewed: number; readyForReview: number };
  byStatus: Named[]; byTeam: Named[]; byFlag: Named[]; byConfidence: Named[];
  avgReadiness: number;
  spark: { total: number[]; drafts: number[]; review: number[]; approved: number[]; completed: number[] };
  trend: { period: string; created: number; approved: number }[];
  attention: { id: string; reference: string; title: string; tag: string }[];
  health: Health;
  /** Crew budgets & delivery economics are a Crew-and-above surface — hidden for Pod-level leads. */
  showBudget?: boolean;
}) {
  const statusTotal = byStatus.reduce((s, r) => s + r.count, 0);
  const dorPct = Math.round((avgReadiness / 5) * 100);
  const flagMax = Math.max(1, ...byFlag.map((f) => f.count));
  const confTotal = Math.max(1, byConfidence.reduce((s, r) => s + r.count, 0));
  const confColor: Record<string, string> = { High: "#10b981", Medium: "#0f766e", Low: "#e0a458", "Very Low": "#e05c5c" };
  const stages = [
    { label: "Draft", n: counts.drafts, c: "var(--gold)" },
    { label: "Ready for review", n: counts.readyForReview, c: "#3b82f6" },
    { label: "Awaiting approval", n: counts.reviewed, c: "#e0a458" },
    { label: "Approved", n: counts.approved, c: "#0f766e" },
    { label: "Completed", n: counts.completed, c: "#10b981" },
  ];
  const stageMax = Math.max(1, ...stages.map((s) => s.n));

  return (
    <div className="space-y-4">
      {/* Health strip — budget/committed/variance are Crew-and-above (crew economics). */}
      <div
        className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4 shadow-[var(--shadow)]"
        style={{ borderLeft: `5px solid ${showBudget ? RAG_TEXT[health.budgetRag] ?? "var(--muted)" : "var(--muted)"}` }}
      >
        {showBudget ? (
          <>
            <span
              className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-bold"
              style={{ color: RAG_TEXT[health.budgetRag], background: "color-mix(in srgb, currentColor 12%, transparent)" }}
            >
              ● {health.budgetLabel}
            </span>
            <Stat label={`Committed vs budget · ${health.year}`}>
              {formatMoney(health.utilised, health.currency)}
              <span className="text-[var(--muted)]"> / {health.budget != null ? formatMoney(health.budget, health.currency) : "no budget"}</span>
              {health.utilizationPct != null ? <span className="text-[var(--muted)]"> · {Math.round(health.utilizationPct * 100)}%</span> : null}
            </Stat>
            <div className="hidden h-8 w-px bg-[var(--line)] sm:block" />
          </>
        ) : null}
        <Stat label="Definition of Ready">{dorPct}%</Stat>
        {showBudget ? (
          <>
            <div className="hidden h-8 w-px bg-[var(--line)] sm:block" />
            <Stat label="Delivery vs estimate">
              {health.deliveryVariancePct == null ? "—" : `${health.deliveryVariancePct > 0 ? "+" : ""}${(health.deliveryVariancePct * 100).toFixed(1)}%`}
            </Stat>
          </>
        ) : null}
        <div className="hidden h-8 w-px bg-[var(--line)] sm:block" />
        <Stat label="CRs need action">
          <span className={health.needsAction > 0 ? "text-[var(--danger)]" : ""}>{health.needsAction}</span>
        </Stat>
      </div>

      {/* KPI cards + sparklines */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Kpi label="Estimates" value={counts.total} series={spark.total} color="#1aa79c" />
        <Kpi label="Drafts" value={counts.drafts} series={spark.drafts} color="#c99a4d" />
        <Kpi label="In review" value={counts.inReview} series={spark.review} color="#d68b1a" />
        <Kpi label="Approved" value={counts.approved} series={spark.approved} color="#12a06a" />
        <Kpi label="Completed" value={counts.completed} series={spark.completed} color="#12a06a" />
      </div>

      {/* Pipeline funnel + donut */}
      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card>
          <Rule />
          <H sub="Where the CRs sit in the workflow — spot the bottleneck">Governance pipeline</H>
          <div className="mt-4 flex flex-1 items-stretch gap-1.5" style={{ minHeight: 180 }}>
            {stages.map((s) => (
              <div key={s.label} className="flex flex-1 flex-col items-center gap-2">
                <div className="flex w-full flex-1 items-end">
                  <div
                    className="flex w-full items-center justify-center rounded-lg font-bold text-white"
                    style={{ height: `${20 + (s.n / stageMax) * 80}%`, minHeight: 28, background: s.c }}
                  >
                    {s.n}
                  </div>
                </div>
                <span className="text-center text-[0.7rem] text-[var(--muted)]">{s.label}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <Rule />
          <H sub="Composition">Estimates by status</H>
          <div className="mt-1 min-h-[14rem] flex-1">
            {statusTotal === 0 ? (
              <p className="pt-10 text-center text-sm text-[var(--muted)]">No estimates yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={byStatus} dataKey="count" nameKey="name" innerRadius={44} outerRadius={72} paddingAngle={2} stroke="var(--panel)" strokeWidth={2} isAnimationActive={false}>
                    {byStatus.map((r, i) => <Cell key={r.name} fill={STATUS_COLORS[i % STATUS_COLORS.length]} />)}
                    <Label value={statusTotal} position="center" fill="var(--navy)" style={{ fontSize: 24, fontWeight: 700 }} />
                  </Pie>
                  <Tooltip contentStyle={TT} formatter={(v) => [`${v}`, "CRs"]} />
                  <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: 11 }} formatter={(v) => <span className="text-[var(--text)]">{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      {/* Flag bars + DoR gauge + confidence */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <Rule />
          <H sub="What the engine flagged — how much needs action">Governance decision mix</H>
          <div className="mt-3 flex flex-1 flex-col justify-center gap-2.5">
            {byFlag.length === 0 ? <p className="text-sm text-[var(--muted)]">Nothing calculated yet.</p> : null}
            {byFlag.slice(0, 6).map((f) => {
              const needsAction = ACTIONISH.has(f.name);
              return (
                <div key={f.name} className="grid grid-cols-[132px_1fr_28px] items-center gap-2 text-sm">
                  <span className="leading-tight text-[var(--muted)]">{f.name}</span>
                  <span className="h-2 rounded bg-[var(--panel-2)]">
                    <span className="block h-full rounded" style={{ width: `${(f.count / flagMax) * 100}%`, background: needsAction ? "#e05c5c" : "#10b981" }} />
                  </span>
                  <span className="text-right font-bold tabular-nums">{f.count}</span>
                </div>
              );
            })}
          </div>
        </Card>
        <Card>
          <Rule />
          <H sub="Portfolio readiness">Definition of Ready</H>
          <div className="flex flex-1 flex-col items-center justify-center gap-1">
            <svg viewBox="0 0 120 74" className="h-32">
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
      </div>

      {/* Volume + trend + attention */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <Rule />
          <H sub="Load across pods — tile size & shade show relative load">Volume by team</H>
          <div className="mt-2 min-h-[14rem] flex-1">
            {byTeam.length === 0 ? (
              <p className="pt-10 text-center text-sm text-[var(--muted)]">No estimates yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <Treemap
                  data={byTeam.map((t) => ({ name: t.name, value: t.count, colorMax: byTeam[0]?.count ?? 1 }))}
                  dataKey="value"
                  isAnimationActive={false}
                  content={<TeamTile />}
                >
                  <Tooltip
                    contentStyle={TT}
                    itemStyle={{ color: "var(--text)" }}
                    labelStyle={{ color: "var(--text)" }}
                    formatter={(v) => [`${v}`, "CRs"]}
                  />
                </Treemap>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
        <Card>
          <Rule />
          <H sub="Created vs approved · 6 months">Activity trend</H>
          <div className="mt-2 min-h-[12rem] flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend} margin={{ top: 16, right: 6, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
                <XAxis dataKey="period" tick={{ fill: "var(--muted)", fontSize: 10 }} axisLine={{ stroke: "var(--line)" }} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fill: "var(--muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TT} />
                <Line type="monotone" dataKey="created" stroke="#c99a4d" strokeWidth={2.5} dot={false} isAnimationActive={false} />
                <Line type="monotone" dataKey="approved" stroke="#10b981" strokeWidth={2.5} dot={false} isAnimationActive={false} />
                <Legend verticalAlign="top" height={20} iconType="plainline" wrapperStyle={{ fontSize: 11 }} formatter={(v) => <span className="text-[var(--muted)]">{v}</span>} />
              </LineChart>
            </ResponsiveContainer>
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

const ACTIONISH = new Set(["SPLIT", "SPLIT EPIC", "SPIKE REQUIRED", "DISCOVERY REQUIRED", "REJECTED"]);

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col">
      <span className="text-base font-bold tabular-nums text-[var(--navy)]">{children}</span>
      <span className="text-xs text-[var(--muted)]">{label}</span>
    </div>
  );
}
