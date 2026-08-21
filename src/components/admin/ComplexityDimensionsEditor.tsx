"use client";

import { useMemo, useState } from "react";
import type { ComplexityDimensionConfig } from "@/domain/estimation/types";

type DimForm = {
  id: string;
  name: string;
  weight: number;
  active: boolean;
  options: [string, string, string, string, string];
};

function toForm(dims: ComplexityDimensionConfig[]): DimForm[] {
  return dims.map((d) => ({
    id: d.id,
    name: d.name,
    weight: d.weight,
    active: d.active !== false,
    options: [
      d.options?.[0] ?? "",
      d.options?.[1] ?? "",
      d.options?.[2] ?? "",
      d.options?.[3] ?? "",
      d.options?.[4] ?? "",
    ],
  }));
}

export function ComplexityDimensionsEditor({
  dimensions,
  readOnly = false,
}: {
  dimensions: ComplexityDimensionConfig[];
  readOnly?: boolean;
}) {
  const [rows, setRows] = useState(() => toForm(dimensions));
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const weightSum = useMemo(
    () => rows.reduce((sum, row) => sum + (Number(row.weight) || 0), 0),
    [rows],
  );
  const weightOk = Math.abs(weightSum - 1) < 0.0001;

  function update(index: number, patch: Partial<DimForm>) {
    setRows((current) => current.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function updateOption(index: number, optIndex: number, value: string) {
    setRows((current) =>
      current.map((row, i) => {
        if (i !== index) return row;
        const options = [...row.options] as DimForm["options"];
        options[optIndex] = value;
        return { ...row, options };
      }),
    );
  }

  async function save() {
    if (!weightOk) {
      setMessage(`Weights must sum to 1.00 (currently ${weightSum.toFixed(4)}).`);
      return;
    }
    const incomplete = rows.find(
      (row) => !row.name.trim() || row.options.some((o) => !String(o).trim()),
    );
    if (incomplete) {
      setMessage(`Fill name and all five score labels for “${incomplete.name || incomplete.id}”.`);
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const payload = rows.map((row) => ({
        id: row.id,
        name: row.name.trim(),
        description: row.name.trim(),
        weight: Number(row.weight),
        minScore: 1,
        maxScore: 5,
        active: row.active,
        options: row.options.map((o) => o.trim()),
        guidance: row.options.map((o) => o.trim()).join(" → "),
      }));
      const res = await fetch("/api/admin/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section: "complexityDimensions", rows: payload }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Save failed");
      setMessage(`Saved configuration ${json.config.versionId}`);
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Complexity dimensions</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          These ten fields drive the Size step dropdowns (score 1–5). Edit names, weights and option
          labels. Weights of active dimensions should sum to 1.00. Dimension ids stay fixed so
          historical estimates still match.
        </p>
      </div>

      <div
        className={`rounded-xl border px-4 py-3 text-sm ${
          weightOk
            ? "border-[var(--line)] bg-[var(--panel-2)] text-[var(--muted)]"
            : "border-rose-200 bg-rose-50 text-[var(--danger)]"
        }`}
      >
        Weight sum: <span className="font-semibold text-[var(--navy)]">{weightSum.toFixed(4)}</span>
        {weightOk ? " (OK)" : " — must equal 1.00 before save"}
      </div>

      <div className="space-y-4">
        {rows.map((row, index) => (
          <section key={row.id} className="card space-y-4 p-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="kicker">Dimension {index + 1}</p>
                <p className="text-xs text-[var(--muted)]">Id: {row.id}</p>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={row.active}
                  disabled={readOnly}
                  onChange={(e) => update(index, { active: e.target.checked })}
                />
                Active
              </label>
            </div>
            <div className="grid gap-3 md:grid-cols-[1fr_140px]">
              <label className="text-sm">
                Display name
                <input
                  className="mt-1 w-full rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-3 py-2"
                  value={row.name}
                  disabled={readOnly}
                  onChange={(e) => update(index, { name: e.target.value })}
                />
              </label>
              <label className="text-sm">
                Weight
                <input
                  type="number"
                  min={0}
                  max={1}
                  step="0.01"
                  className="mt-1 w-full rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-3 py-2"
                  value={row.weight}
                  disabled={readOnly}
                  onChange={(e) => update(index, { weight: Number(e.target.value) })}
                />
              </label>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-[var(--navy)]">Dropdown labels (score 1–5)</p>
              <div className="grid gap-2 md:grid-cols-5">
                {row.options.map((opt, optIndex) => (
                  <label key={optIndex} className="text-xs text-[var(--muted)]">
                    Score {optIndex + 1}
                    <input
                      className="mt-1 w-full rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-2 py-2 text-sm text-[var(--text)]"
                      value={opt}
                      disabled={readOnly}
                      onChange={(e) => updateOption(index, optIndex, e.target.value)}
                    />
                  </label>
                ))}
              </div>
            </div>
          </section>
        ))}
      </div>

      {readOnly ? (
        <p className="text-sm text-[var(--muted)]">Read only for this role.</p>
      ) : (
        <button className="btn-primary" type="button" disabled={busy || !weightOk} onClick={save}>
          {busy ? "Saving…" : "Save and publish version"}
        </button>
      )}
      {message ? (
        <p className={`text-sm ${message.startsWith("Saved") ? "text-[var(--ok)]" : "text-[var(--danger)]"}`}>
          {message}
        </p>
      ) : null}
    </div>
  );
}
