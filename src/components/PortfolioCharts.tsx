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
}: {
  countByFlag: Record<string, number>;
  costByTshirt: Record<string, number>;
  currency: string;
}) {
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
              <CartesianGrid strokeDasharray="3 3" stroke="#2a3544" />
              <XAxis dataKey="name" tick={{ fill: "#93a4b8", fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={70} />
              <YAxis allowDecimals={false} tick={{ fill: "#93a4b8", fontSize: 12 }} />
              <Tooltip
                contentStyle={{ background: "#171e27", border: "1px solid #2a3544" }}
                formatter={(value, _name, item) => [value, String(item?.payload?.full ?? "Count")]}
              />
              <Bar dataKey="count" fill="#2dd4bf" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
      <section className="card p-5">
        <h2 className="font-medium">Cost by T-Shirt (AI-adj)</h2>
        <div className="mt-4 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={shirts}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a3544" />
              <XAxis dataKey="name" tick={{ fill: "#93a4b8", fontSize: 12 }} />
              <YAxis tick={{ fill: "#93a4b8", fontSize: 12 }} />
              <Tooltip
                contentStyle={{ background: "#171e27", border: "1px solid #2a3544" }}
                formatter={(value) => [`${currency} ${Number(value).toLocaleString()}`, "AI-adj cost"]}
              />
              <Bar dataKey="cost" fill="#38bdf8" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}
