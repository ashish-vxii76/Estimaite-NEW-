"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
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
            <BarChart data={flags} margin={{ top: 18, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
              <XAxis dataKey="name" tick={{ fill: "var(--muted)", fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={70} />
              <YAxis allowDecimals={false} tick={{ fill: "var(--muted)", fontSize: 12 }} />
              <Tooltip
                contentStyle={{ background: "var(--panel)", border: "1px solid var(--line)", color: "var(--text)" }}
                formatter={(value, _name, item) => [value, String(item?.payload?.full ?? "Count")]}
              />
              <Bar dataKey="count" fill="var(--gold)" radius={[6, 6, 0, 0]}>
                <LabelList dataKey="count" position="top" fill="var(--navy)" fontSize={12} fontWeight={600} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
      <section className="card p-5">
        <h2 className="font-medium">Cost by T-Shirt (AI-adj)</h2>
        <div className="mt-4 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={shirts} margin={{ top: 18, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
              <XAxis dataKey="name" tick={{ fill: "var(--muted)", fontSize: 12 }} />
              <YAxis tick={{ fill: "var(--muted)", fontSize: 12 }} />
              <Tooltip
                contentStyle={{ background: "var(--panel)", border: "1px solid var(--line)", color: "var(--text)" }}
                formatter={(value) => [`${currency} ${Number(value).toLocaleString()}`, "AI-adj cost"]}
              />
              <Bar dataKey="cost" fill="var(--teal)" radius={[6, 6, 0, 0]}>
                <LabelList
                  dataKey="cost"
                  position="top"
                  fill="var(--navy)"
                  fontSize={11}
                  fontWeight={600}
                  formatter={(value) => (Number(value) > 0 ? Number(value).toLocaleString() : "")}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}
