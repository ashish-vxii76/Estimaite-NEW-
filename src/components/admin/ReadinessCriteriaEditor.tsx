"use client";

import { useState } from "react";
import type { ReadinessCriterionConfig } from "@/domain/estimation/types";

export function ReadinessCriteriaEditor({
  criteria,
  assumptionsMin,
  readOnly = false,
}: {
  criteria: ReadinessCriterionConfig[];
  assumptionsMin: number;
  readOnly?: boolean;
}) {
  const [rows, setRows] = useState(criteria.map((c) => ({ ...c })));
  const [minScore, setMinScore] = useState(assumptionsMin);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  function update(index: number, patch: Partial<ReadinessCriterionConfig>) {
    setRows((current) => current.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function addRow() {
    const n = rows.length + 1;
    setRows((current) => [...current, { id: `criterion_${n}`, label: `New criterion ${n}` }]);
  }

  function removeRow(index: number) {
    setRows((current) => current.filter((_, i) => i !== index));
  }

  async function save() {
    const cleaned = rows
      .map((r) => ({ id: r.id.trim(), label: r.label.trim() }))
      .filter((r) => r.id && r.label);
    if (!cleaned.length) {
      setMessage("Keep at least one Definition of Ready criterion.");
      return;
    }
    const ids = new Set(cleaned.map((r) => r.id));
    if (ids.size !== cleaned.length) {
      setMessage("Criterion ids must be unique.");
      return;
    }
    if (minScore < 1 || minScore > cleaned.length) {
      setMessage(`Assumptions minimum must be between 1 and ${cleaned.length}.`);
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section: "readinessCriteria",
          rows: cleaned,
          readinessAssumptionsMin: minScore,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Save failed");
      setRows(cleaned);
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
        <h1 className="text-2xl font-semibold">Definition of Ready</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          These Yes/No questions appear on the Ready step. Full Yes count = Ready for Estimation;
          at/above the assumptions threshold = Estimate with Assumptions; below = Discovery Required.
          Prefer stable ids so historical answers still match.
        </p>
      </div>

      <section className="card space-y-3 p-5">
        <label className="block text-sm">
          Assumptions threshold (Yes count)
          <input
            type="number"
            min={1}
            max={Math.max(rows.length, 1)}
            className="mt-1 w-full max-w-xs rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-3 py-2"
            value={minScore}
            disabled={readOnly}
            onChange={(e) => setMinScore(Number(e.target.value))}
          />
        </label>
        <p className="text-xs text-[var(--muted)]">
          Ready requires all {rows.length || "N"} Yes. Assumptions starts at this score.
        </p>
      </section>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-[var(--panel-2)] text-[var(--muted)]">
            <tr>
              <th className="px-3 py-2">Id</th>
              <th className="px-3 py-2">Label</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${row.id}-${index}`} className="border-t border-[var(--line)]">
                <td className="px-2 py-1">
                  <input
                    className="w-full rounded border border-[var(--line)] bg-[var(--panel-2)] px-2 py-1 font-mono text-xs"
                    value={row.id}
                    disabled={readOnly}
                    onChange={(e) => update(index, { id: e.target.value })}
                  />
                </td>
                <td className="px-2 py-1">
                  <input
                    className="w-full rounded border border-[var(--line)] bg-[var(--panel-2)] px-2 py-1"
                    value={row.label}
                    disabled={readOnly}
                    onChange={(e) => update(index, { label: e.target.value })}
                  />
                </td>
                <td className="px-2 py-1 text-right">
                  {readOnly ? null : (
                    <button
                      type="button"
                      className="text-xs text-[var(--danger)]"
                      onClick={() => removeRow(index)}
                    >
                      Remove
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {readOnly ? (
        <p className="text-sm text-[var(--muted)]">Read only for this role.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-ghost" onClick={addRow}>
            Add criterion
          </button>
          <button type="button" className="btn-primary" disabled={busy} onClick={save}>
            {busy ? "Saving…" : "Save and publish version"}
          </button>
        </div>
      )}
      {message ? (
        <p className={`text-sm ${message.startsWith("Saved") ? "text-[var(--ok)]" : "text-[var(--danger)]"}`}>
          {message}
        </p>
      ) : null}
    </div>
  );
}
