"use client";

import { useMemo, useState } from "react";

export type Column = {
  key: string;
  label: string;
  type?: "text" | "number" | "boolean" | "select";
  options?: string[];
  width?: string;
};

export function MappingEditor({
  title,
  description,
  section,
  columns,
  rows,
  allowAdd = true,
  readOnly = false,
  hideHeader = false,
  crew,
  seedRows,
  saveLabel,
  onSaved,
}: {
  title: string;
  description: string;
  section: string;
  columns: Column[];
  rows: Record<string, unknown>[];
  allowAdd?: boolean;
  readOnly?: boolean;
  hideHeader?: boolean;
  /** DEC-011: when set, Save writes to the crew's override instead of the global config. */
  crew?: { crewId: string; table: string };
  /** DEC-011: global rows for the "Copy from global" reseed in crew mode. */
  seedRows?: Record<string, unknown>[];
  saveLabel?: string;
  onSaved?: () => void;
}) {
  const [data, setData] = useState(rows);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const blank = useMemo(
    () => Object.fromEntries(columns.map((c) => [c.key, c.type === "number" ? 0 : c.type === "boolean" ? false : ""])),
    [columns],
  );

  function update(index: number, key: string, value: string, type?: Column["type"]) {
    setData((current) =>
      current.map((row, i) => {
        if (i !== index) return row;
        const parsed =
          type === "number" ? Number(value) : type === "boolean" ? value === "true" : value;
        return { ...row, [key]: parsed };
      }),
    );
  }

  async function save() {
    setBusy(true);
    setMessage("");
    try {
      if (crew) {
        const res = await fetch("/api/admin/crew-mappings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "save", table: crew.table, crewId: crew.crewId, rows: data }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Save failed");
        setMessage("Saved crew-specific mappings.");
        onSaved?.();
      } else {
        const res = await fetch("/api/admin/config", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ section, rows: data }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Save failed");
        setMessage(`Saved configuration ${json.config.versionId}`);
      }
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {hideHeader ? null : (
        <div>
          <h1 className="text-2xl font-semibold">{title}</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">{description}</p>
        </div>
      )}
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-[var(--panel-2)] text-[var(--muted)]">
            <tr>
              {columns.map((col) => (
                <th key={col.key} className="px-3 py-2 font-medium">
                  {col.label}
                </th>
              ))}
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => (
              <tr key={index} className="border-t border-[var(--line)]">
                {columns.map((col) => (
                  <td key={col.key} className="px-2 py-1">
                    {col.type === "select" ? (
                      <select
                        className="w-full rounded border border-[var(--line)] bg-[var(--panel-2)] px-2 py-1"
                        value={String(row[col.key] ?? "")}
                        disabled={readOnly}
                        onChange={(e) => update(index, col.key, e.target.value, col.type)}
                      >
                        {(col.options ?? []).map((opt) => (
                          <option key={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : col.type === "boolean" ? (
                      <select
                        className="w-full rounded border border-[var(--line)] bg-[var(--panel-2)] px-2 py-1"
                        value={String(Boolean(row[col.key]))}
                        disabled={readOnly}
                        onChange={(e) => update(index, col.key, e.target.value, "boolean")}
                      >
                        <option value="true">Yes</option>
                        <option value="false">No</option>
                      </select>
                    ) : (
                      <input
                        className="w-full rounded border border-[var(--line)] bg-[var(--panel-2)] px-2 py-1"
                        type={col.type === "number" ? "number" : "text"}
                        step="any"
                        disabled={readOnly}
                        value={String(row[col.key] ?? "")}
                        onChange={(e) => update(index, col.key, e.target.value, col.type)}
                      />
                    )}
                  </td>
                ))}
                <td className="px-2 py-1">
                  {readOnly ? null : (
                  <button
                    className="text-xs text-rose-300"
                    onClick={() => setData((current) => current.filter((_, i) => i !== index))}
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
        <p className="text-sm text-[var(--muted)]">Read only for this role. Admin publishes mapping versions.</p>
      ) : (
      <div className="flex flex-wrap gap-2">
        {allowAdd ? (
          <button
            className="rounded-lg border border-[var(--line)] px-3 py-2"
            onClick={() => setData((current) => [...current, { ...blank }])}
          >
            Add row
          </button>
        ) : null}
        {crew && seedRows ? (
          <button
            className="rounded-lg border border-[var(--line)] px-3 py-2"
            onClick={() => setData(seedRows.map((r) => ({ ...r })))}
          >
            Copy from global
          </button>
        ) : null}
        <button
          className="btn-primary"
          onClick={save}
          disabled={busy}
        >
          {saveLabel ?? "Save and publish version"}
        </button>
      </div>
      )}
      {message ? <p className="text-sm text-[var(--ok)]">{message}</p> : null}
    </div>
  );
}
