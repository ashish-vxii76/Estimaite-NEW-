"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { T_SHIRTS } from "@/domain/estimation/types";
import { DELIVERY_FLAGS } from "@/domain/estimation/portfolio";

export function PortfolioCharts({
  countByFlag,
  costByTshirt,
  currency,
  sampleCount,
  minSamples = 5,
}: {
  countByFlag: Record<string, number>;
  costByTshirt: Record<string, number>;
  currency: string;
  sampleCount: number;
  minSamples?: number;
}) {
  if (sampleCount < minSamples) {
    return (
      <section className="card p-5 text-sm text-[var(--muted)]">
        Insufficient data — {sampleCount} of {minSamples} estimates required before portfolio charts
        render.
      </section>
    );
  }
  const flags = DELIVERY_FLAGS.map((flag) => ({
    name: flag.replace(" REQUIRED", ""),
    full: flag,
    count: countByFlag[flag] ?? 0,
  }));
  const shirts = T_SHIRTS.map((tshirt) => ({
    name: tshirt,
    cost: costByTshirt[tshirt] ?? 0,
  }));

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="card p-5">
        <h2 className="font-medium">Count by Delivery Flag</h2>
        <div className="mt-4 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={flags}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ddd6c8" />
              <XAxis dataKey="name" tick={{ fill: "#5c6b80", fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={70} />
              <YAxis allowDecimals={false} tick={{ fill: "#5c6b80", fontSize: 12 }} />
              <Tooltip
                contentStyle={{ background: "#fffcf7", border: "1px solid #ddd6c8", color: "#1b2a4a" }}
                formatter={(value, _name, item) => [value, String(item?.payload?.full ?? "Count")]}
              />
              <Bar dataKey="count" fill="#1e3a5f" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
      <section className="card p-5">
        <h2 className="font-medium">Cost by T-Shirt (AI-adj)</h2>
        <div className="mt-4 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={shirts}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ddd6c8" />
              <XAxis dataKey="name" tick={{ fill: "#5c6b80", fontSize: 12 }} />
              <YAxis tick={{ fill: "#5c6b80", fontSize: 12 }} />
              <Tooltip
                contentStyle={{ background: "#fffcf7", border: "1px solid #ddd6c8", color: "#1b2a4a" }}
                formatter={(value) => [`${currency} ${Number(value).toLocaleString()}`, "AI-adj cost"]}
              />
              <Bar dataKey="cost" fill="#0f766e" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}
