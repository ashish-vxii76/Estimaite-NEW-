"use client";

import { useState } from "react";
import type { EstimationConfig } from "@/domain/estimation/types";

export function ConfigEditor({
  config,
  locations,
  versions,
}: {
  config: EstimationConfig;
  locations: { id: string; name: string; dailyRate: number; currency: string }[];
  versions: { id: string; createdAt: Date; active: boolean }[];
}) {
  const [json, setJson] = useState(JSON.stringify(config, null, 2));
  const [message, setMessage] = useState("");

  async function save() {
    const parsed = JSON.parse(json);
    const res = await fetch("/api/configuration", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ config: parsed }),
    });
    const data = await res.json();
    setMessage(res.ok ? `Saved ${data.config.versionId}` : data.error ?? "Save failed");
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[2fr_1fr]">
      <section className="card p-4">
        <textarea
          className="h-[32rem] w-full rounded-lg bg-[var(--panel-2)] p-3 font-mono text-xs"
          value={json}
          onChange={(e) => setJson(e.target.value)}
        />
        <button className="mt-3 rounded-lg bg-teal-400 px-4 py-2 text-slate-950" onClick={save}>
          Publish new configuration version
        </button>
        {message ? <p className="mt-2 text-sm text-teal-200">{message}</p> : null}
      </section>
      <aside className="space-y-4">
        <section className="card p-4 text-sm">
          <h2 className="font-medium">Locations</h2>
          <ul className="mt-2 space-y-1 text-[var(--muted)]">
            {locations.map((l) => (
              <li key={l.id}>
                {l.name}: {l.dailyRate} {l.currency}
              </li>
            ))}
          </ul>
        </section>
        <section className="card p-4 text-sm">
          <h2 className="font-medium">Versions</h2>
          <ul className="mt-2 space-y-1 text-[var(--muted)]">
            {versions.map((v) => (
              <li key={v.id}>
                {v.id} {v.active ? "(active)" : ""}
              </li>
            ))}
          </ul>
        </section>
      </aside>
    </div>
  );
}
