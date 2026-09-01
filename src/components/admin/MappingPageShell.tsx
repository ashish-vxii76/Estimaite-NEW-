"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CrewScopePanel } from "@/components/admin/CrewScopePanel";
import { MappingEditor, type Column } from "@/components/admin/MappingEditor";

type Table = "ISSUE" | "EPIC" | "COMPLEXITY";
type Row = Record<string, unknown>;
type Unit = { id: string; type: string; name: string; parentId: string | null };

// DEC-011: wraps a global mapping editor with the Company→Crew scope panel and a
// global/crew-specific toggle. Global mode = the existing governed editor. Crew mode = the crew's
// opt-in (admin-approved) override of the same table.
export function MappingPageShell({
  table,
  title,
  description,
  section,
  columns,
  globalRows,
  units,
  lockedUnitIds,
  crews,
  activeCrewId,
  override,
  canEditGlobal,
  canWriteCrew,
  canApprove,
}: {
  table: Table;
  title: string;
  description: string;
  section: string;
  columns: Column[];
  globalRows: Row[];
  units: Unit[];
  lockedUnitIds: string[];
  crews: { id: string; name: string }[];
  activeCrewId: string | null;
  override: { status: string; version: number; rows: Row[] } | null;
  canEditGlobal: boolean;
  canWriteCrew: boolean;
  canApprove: boolean;
}) {
  const router = useRouter();
  const isApproved = override?.status === "APPROVED";
  const isRequested = override?.status === "REQUESTED";
  const [mode, setMode] = useState<"global" | "crew">("global");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const crewName = crews.find((c) => c.id === activeCrewId)?.name ?? "—";

  async function call(action: string) {
    if (!activeCrewId) return;
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/crew-mappings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, table, crewId: activeCrewId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Action failed");
      router.refresh();
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function revert() {
    if (!window.confirm(`Revert ${crewName} to global ${title.toLowerCase()}? Its crew-specific rows are discarded.`)) return;
    await call("revert");
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-semibold text-[var(--navy)]">{title}</h1>
        <p className="mt-1 max-w-3xl text-sm text-[var(--muted)]">{description}</p>
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
            <MappingEditor
              title={title}
              description={description}
              section={section}
              columns={columns}
              rows={globalRows}
              readOnly={!canEditGlobal}
              hideHeader
            />
          ) : !activeCrewId ? (
            <p className="text-sm text-[var(--muted)]">No crew in your scope to configure.</p>
          ) : isApproved ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                {canWriteCrew ? (
                  <button type="button" className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-sm text-[var(--muted)]" disabled={busy} onClick={revert}>
                    Revert to global
                  </button>
                ) : null}
                <span className="text-xs text-[var(--muted)]">Crew-specific · v{override?.version} · cross-crew rollups compare in person-days</span>
              </div>
              <MappingEditor
                title={title}
                description={description}
                section={section}
                columns={columns}
                rows={override?.rows ?? []}
                seedRows={globalRows}
                crew={{ crewId: activeCrewId, table }}
                readOnly={!canWriteCrew}
                hideHeader
                saveLabel={`Save for ${crewName}`}
                onSaved={() => router.refresh()}
              />
            </div>
          ) : isRequested ? (
            <div className="flex flex-wrap items-center gap-2 rounded-lg bg-[var(--panel-2)] px-3 py-2 text-sm text-[var(--navy)]">
              <span>Crew-specific {title.toLowerCase()} requested — pending administrator approval.</span>
              {canApprove ? (
                <button type="button" className="btn-primary text-sm" disabled={busy} onClick={() => call("approve")}>Approve</button>
              ) : null}
              {canWriteCrew ? (
                <button type="button" className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-sm text-[var(--muted)]" disabled={busy} onClick={revert}>Cancel request</button>
              ) : null}
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2 rounded-lg bg-[var(--panel-2)] px-3 py-2 text-sm text-[var(--navy)]">
              <span>{crewName} uses the governed global {title.toLowerCase()}. Opt into a crew-specific copy (admin-approved)?</span>
              {canWriteCrew ? (
                <button type="button" className="btn-primary text-sm" disabled={busy} onClick={() => call("request")}>Request crew-specific</button>
              ) : null}
            </div>
          )}

          {message ? <p className="text-sm text-[var(--navy)]">{message}</p> : null}
        </section>
      </div>
    </div>
  );
}
