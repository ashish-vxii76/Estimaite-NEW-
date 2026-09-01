"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { CrewScopePanel } from "@/components/admin/CrewScopePanel";
import { MAPPING_TABLE_META, MAPPING_TABLE_ORDER } from "@/components/admin/crewMappingTables";

type Table = "ISSUE" | "EPIC" | "COMPLEXITY";
type Row = Record<string, unknown>;
type Unit = { id: string; type: string; name: string; parentId: string | null };

export function CrewMappingsManager({
  table,
  units,
  lockedUnitIds,
  crews,
  activeCrewId,
  globalRows,
  override,
  canWrite,
  canApprove,
}: {
  table: Table;
  units: Unit[];
  lockedUnitIds: string[];
  crews: { id: string; name: string }[];
  activeCrewId: string | null;
  globalRows: Row[];
  override: { status: string; version: number; rows: Row[] } | null;
  canWrite: boolean;
  canApprove: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const meta = MAPPING_TABLE_META[table];

  const isApproved = override?.status === "APPROVED";
  const isRequested = override?.status === "REQUESTED";
  const [mode, setMode] = useState<"global" | "crew">(override ? "crew" : "global");
  const [rows, setRows] = useState<Row[]>(override?.rows ?? []);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  // Sync editable rows whenever the server sends a fresh override (opt-in approved, saved, reverted).
  // Server prop identity only changes on router.refresh()/navigation, never on client re-renders, so
  // in-progress edits are never clobbered.
  useEffect(() => {
    setRows(override?.rows ?? []);
  }, [override]);

  // Reset the global/crew view when the crew or table changes (a fresh context), following that
  // context's override status; a user's manual toggle within the same context is left alone.
  useEffect(() => {
    setMode(override?.status === "APPROVED" || override?.status === "REQUESTED" ? "crew" : "global");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, activeCrewId]);

  const crewName = crews.find((c) => c.id === activeCrewId)?.name ?? "—";
  const dirty = useMemo(() => JSON.stringify(rows) !== JSON.stringify(override?.rows ?? []), [rows, override]);

  function switchTable(t: Table) {
    const next = new URLSearchParams(params.toString());
    next.set("table", t);
    router.push(`${pathname}?${next.toString()}`);
  }

  async function call(action: string, extra: Record<string, unknown> = {}) {
    if (!activeCrewId) return;
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/crew-mappings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, table, crewId: activeCrewId, ...extra }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Action failed");
      return data;
    } catch (e) {
      setMessage((e as Error).message);
      throw e;
    } finally {
      setBusy(false);
    }
  }

  async function requestOptIn() {
    await call("request");
    setMessage("Requested — pending administrator approval.");
    router.refresh();
  }
  async function approve() {
    await call("approve");
    setMessage("Approved — this crew now uses crew-specific mappings.");
    router.refresh();
  }
  async function revert() {
    if (!window.confirm(`Revert ${crewName} to global ${meta.label.toLowerCase()}? Its crew-specific rows are discarded.`)) return;
    await call("revert");
    setMessage("Reverted to global.");
    router.refresh();
  }
  async function save() {
    await call("save", { rows });
    setMessage("Saved crew-specific mappings.");
    router.refresh();
  }
  function copyFromGlobal() {
    setRows(JSON.parse(JSON.stringify(globalRows)));
    setMessage("Prefilled from global — edit, then Save.");
  }
  function addRow() {
    const blank: Row = {};
    for (const c of meta.columns) blank[c.key] = c.num ? 0 : "";
    setRows((r) => [...r, blank]);
  }
  function editCell(i: number, key: string, value: string, num?: boolean) {
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, [key]: num ? Number(value) : value } : row)));
  }
  function deleteRow(i: number) {
    setRows((r) => r.filter((_, idx) => idx !== i));
  }

  const showEditable = mode === "crew" && isApproved;
  const displayRows = showEditable ? rows : globalRows;

  return (
    <div className="space-y-5">
      <header>
        <p className="kicker">Configuration</p>
        <h1 className="font-display text-2xl font-semibold text-[var(--navy)]">Crew mappings</h1>
        <p className="mt-1 max-w-3xl text-sm text-[var(--muted)]">
          Mappings are governed globally. A crew may opt into its own copy (admin-approved) if it doesn&apos;t
          want global. Crew-specific mappings are version-pinned; cross-crew rollups compare in person-days.
        </p>
      </header>

      <div className="flex gap-2">
        {MAPPING_TABLE_ORDER.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => switchTable(t)}
            className={`rounded-lg border px-3 py-1.5 text-sm ${
              t === table
                ? "border-[var(--line)] bg-[var(--panel-2)] font-medium text-[var(--navy)]"
                : "border-transparent text-[var(--muted)]"
            }`}
          >
            {MAPPING_TABLE_META[t].label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-start gap-4">
        <CrewScopePanel units={units} lockedUnitIds={lockedUnitIds} activeCrewId={activeCrewId} />

        <section className="min-w-[340px] flex-1 space-y-3">
          <div className="flex w-fit gap-1.5 rounded-xl border border-[var(--line)] bg-[var(--panel-2)] p-1">
            <button
              type="button"
              onClick={() => setMode("global")}
              className={`rounded-lg px-3.5 py-1.5 text-sm ${mode === "global" ? "bg-[var(--panel)] font-medium text-[var(--navy)]" : "text-[var(--muted)]"}`}
            >
              Use global (governed)
            </button>
            <button
              type="button"
              onClick={() => setMode("crew")}
              className={`rounded-lg px-3.5 py-1.5 text-sm ${mode === "crew" ? "bg-[var(--panel)] font-medium text-[var(--navy)]" : "text-[var(--muted)]"}`}
            >
              Use crew-specific
            </button>
          </div>

          {mode === "global" ? (
            <div className="rounded-lg bg-[var(--panel-2)] px-3 py-2 text-sm text-[var(--navy)]">
              {crewName} uses the governed global {meta.label.toLowerCase()} — comparable with every crew.
            </div>
          ) : isApproved ? (
            <div className="flex flex-wrap items-center gap-2">
              {canWrite ? (
                <>
                  <button type="button" className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-sm text-[var(--navy)]" onClick={copyFromGlobal}>
                    Copy from global
                  </button>
                  <button type="button" className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-sm text-[var(--muted)]" onClick={revert}>
                    Revert to global
                  </button>
                </>
              ) : null}
              <span className="text-xs text-[var(--muted)]">Crew-specific · v{override?.version} · rollups in person-days</span>
            </div>
          ) : isRequested ? (
            <div className="flex flex-wrap items-center gap-2 rounded-lg bg-[var(--panel-2)] px-3 py-2 text-sm text-[var(--navy)]">
              <span>Crew-specific mappings requested — pending administrator approval.</span>
              {canApprove ? (
                <button type="button" className="btn-primary text-sm" disabled={busy} onClick={approve}>Approve</button>
              ) : null}
              {canWrite ? (
                <button type="button" className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-sm text-[var(--muted)]" disabled={busy} onClick={revert}>Cancel request</button>
              ) : null}
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2 rounded-lg bg-[var(--panel-2)] px-3 py-2 text-sm text-[var(--navy)]">
              <span>{crewName} is on global. Opt into crew-specific {meta.label.toLowerCase()} (admin-approved)?</span>
              {canWrite ? (
                <button type="button" className="btn-primary text-sm" disabled={busy || !activeCrewId} onClick={requestOptIn}>Request crew-specific</button>
              ) : null}
            </div>
          )}

          <div className="overflow-x-auto rounded-xl border border-[var(--line)]">
            <table className="w-full text-left text-xs" style={{ minWidth: meta.columns.length * 84 }}>
              <thead className="text-[11px] uppercase text-[var(--muted)]">
                <tr>
                  {meta.columns.map((c) => (
                    <th key={c.key} className="px-2.5 py-2">{c.label}</th>
                  ))}
                  {showEditable ? <th className="px-2.5 py-2 text-right">·</th> : null}
                </tr>
              </thead>
              <tbody>
                {displayRows.map((row, i) => (
                  <tr key={i} className="border-t border-[var(--line)]">
                    {meta.columns.map((c) => (
                      <td key={c.key} className="px-2.5 py-1.5 text-[var(--navy)]">
                        {showEditable ? (
                          <input
                            type={c.num ? "number" : "text"}
                            step={c.num ? "any" : undefined}
                            className={`${c.wide ? "w-40" : c.num ? "w-16" : "w-24"} rounded border border-[var(--line)] bg-[var(--panel-2)] px-1.5 py-1`}
                            value={String(row[c.key] ?? "")}
                            onChange={(e) => editCell(i, c.key, e.target.value, c.num)}
                          />
                        ) : (
                          String(row[c.key] ?? "")
                        )}
                      </td>
                    ))}
                    {showEditable ? (
                      <td className="px-2.5 py-1.5 text-right">
                        <button type="button" aria-label="Delete row" className="text-[var(--danger)]" onClick={() => deleteRow(i)}>✕</button>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {showEditable && canWrite ? (
            <div className="flex items-center gap-3">
              <button type="button" className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-sm text-[var(--navy)]" onClick={addRow}>+ Add row</button>
              <button type="button" className="btn-primary text-sm" disabled={busy || !dirty} onClick={save}>Save for {crewName}</button>
              {dirty ? <span className="text-xs text-[var(--muted)]">Unsaved changes</span> : null}
            </div>
          ) : null}

          {message ? <p className="text-sm text-[var(--navy)]">{message}</p> : null}
          {!canWrite ? <p className="text-sm text-[var(--muted)]">Read only for this role.</p> : null}
        </section>
      </div>
    </div>
  );
}
