"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const COLORS = ["#1e3a5f", "#0f766e", "#b45309", "#5c6b80", "#b42318", "#047857"];
const TOOLTIP = { background: "#fffcf7", border: "1px solid #ddd6c8", color: "#1b2a4a" };

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
  if (value <= 0) return null;
  const radian = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) / 2;
  const x = cx + radius * Math.cos(-midAngle * radian);
  const y = cy + radius * Math.sin(-midAngle * radian);
  return (
    <text
      x={x}
      y={y}
      fill="#fff"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={12}
      fontWeight={700}
    >
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
        <h2 className="font-medium">Estimates by status</h2>
        <div className="mt-4 h-80">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={byStatus}
                dataKey="count"
                nameKey="name"
                innerRadius={52}
                outerRadius={96}
                paddingAngle={2}
                label={PercentInside}
                labelLine={false}
              >
                {byStatus.map((row, index) => (
                  <Cell key={row.name} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={TOOLTIP}
                formatter={(value) => [`${value} estimates`, "Count"]}
              />
              <Legend
                verticalAlign="bottom"
                iconType="circle"
                formatter={(value) => <span className="text-[var(--text)]">{value}</span>}
                wrapperStyle={{ fontSize: 12, color: "#1b2a4a" }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </section>
      <section className="card p-5">
        <h2 className="font-medium">Volume by team</h2>
        <div className="mt-4 h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byTeam} margin={{ top: 18, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ddd6c8" />
              <XAxis dataKey="name" tick={{ fill: "#5c6b80", fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fill: "#5c6b80", fontSize: 12 }} />
              <Tooltip contentStyle={TOOLTIP} />
              <Bar dataKey="count" fill="#1e3a5f" radius={[6, 6, 0, 0]}>
                <LabelList dataKey="count" position="top" fill="#1b2a4a" fontSize={12} fontWeight={600} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}
