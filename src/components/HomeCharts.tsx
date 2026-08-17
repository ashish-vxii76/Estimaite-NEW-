"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const COLORS = ["#1e3a5f", "#0f766e", "#b45309", "#5c6b80", "#b42318", "#047857"];
const TOOLTIP = { background: "#fffcf7", border: "1px solid #ddd6c8", color: "#1b2a4a" };

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
        <div className="mt-4 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={byStatus} dataKey="count" nameKey="name" innerRadius={50} outerRadius={90}>
                {byStatus.map((row, index) => (
                  <Cell key={row.name} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={TOOLTIP} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </section>
      <section className="card p-5">
        <h2 className="font-medium">Volume by team</h2>
        <div className="mt-4 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byTeam}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ddd6c8" />
              <XAxis dataKey="name" tick={{ fill: "#5c6b80", fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fill: "#5c6b80", fontSize: 12 }} />
              <Tooltip contentStyle={TOOLTIP} />
              <Bar dataKey="count" fill="#1e3a5f" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}
