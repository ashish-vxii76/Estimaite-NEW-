"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Label,
  LabelList,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

// Mid-tone palette chosen to stay legible on both the cream and dark grounds
// (pure navy is dropped because it vanishes on the dark theme).
const COLORS = ["#0f766e", "#b08d57", "#3b82f6", "#e0a458", "#e05c5c", "#10b981", "#8b7bb8"];
const TOOLTIP = {
  background: "var(--panel)",
  border: "1px solid var(--line)",
  borderRadius: 10,
  color: "var(--text)",
  boxShadow: "var(--shadow)",
};

function PercentInside({
  cx = 0,
  cy = 0,
  midAngle = 0,
  innerRadius = 0,
  outerRadius = 0,
  percent = 0,
}: {
  cx?: number;
  cy?: number;
  midAngle?: number;
  innerRadius?: number;
  outerRadius?: number;
  percent?: number;
}) {
  const value = Math.round(percent * 100);
  if (value < 8) return null; // hide labels on slivers to avoid clutter
  const radian = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) / 2;
  const x = cx + radius * Math.cos(-midAngle * radian);
  const y = cy + radius * Math.sin(-midAngle * radian);
  return (
    <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={700}>
      {value}%
    </text>
  );
}

export function HomeCharts({
  byStatus,
  byTeam,
}: {
  byStatus: { name: string; count: number }[];
  byTeam: { name: string; count: number }[];
}) {
  const statusTotal = byStatus.reduce((sum, row) => sum + row.count, 0);
  if (statusTotal === 0) {
    return (
      <section className="card p-5 text-sm text-[var(--muted)]">
        No estimates yet. Charts appear here once work items are saved.
      </section>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="card p-5">
        <hr className="gold-rule mb-4 w-10" />
        <h2 className="font-display text-lg font-semibold text-[var(--navy)]">Estimates by status</h2>
        <div className="mt-3 h-80">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={byStatus}
                dataKey="count"
                nameKey="name"
                innerRadius={56}
                outerRadius={96}
                paddingAngle={2}
                stroke="var(--panel)"
                strokeWidth={2}
                label={PercentInside}
                labelLine={false}
                isAnimationActive={false}
              >
                {byStatus.map((row, index) => (
                  <Cell key={row.name} fill={COLORS[index % COLORS.length]} />
                ))}
                <Label
                  value={statusTotal}
                  position="center"
                  fill="var(--navy)"
                  style={{ fontSize: 30, fontWeight: 700 }}
                />
                <Label value="total" position="center" dy={22} fill="var(--muted)" style={{ fontSize: 11, letterSpacing: 1 }} />
              </Pie>
              <Tooltip contentStyle={TOOLTIP} formatter={(value) => [`${value} estimates`, "Count"]} />
              <Legend
                verticalAlign="bottom"
                iconType="circle"
                formatter={(value) => <span className="text-[var(--text)]">{value}</span>}
                wrapperStyle={{ fontSize: 12 }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </section>
      <section className="card p-5">
        <hr className="gold-rule mb-4 w-10" />
        <h2 className="font-display text-lg font-semibold text-[var(--navy)]">Volume by team</h2>
        <div className="mt-3 h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byTeam} margin={{ top: 18, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="barGold" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--gold-2)" />
                  <stop offset="100%" stopColor="var(--gold)" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: "var(--muted)", fontSize: 11 }} axisLine={{ stroke: "var(--line)" }} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fill: "var(--muted)", fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={TOOLTIP} cursor={{ fill: "var(--gold-soft)" }} />
              <Bar dataKey="count" fill="url(#barGold)" radius={[6, 6, 0, 0]} maxBarSize={64} isAnimationActive={false}>
                <LabelList dataKey="count" position="top" fill="var(--navy)" fontSize={12} fontWeight={700} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}
