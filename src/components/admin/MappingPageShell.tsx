"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CrewScopePanel } from "@/components/admin/CrewScopePanel";
import { MappingEditor, type Column } from "@/components/admin/MappingEditor";
import type { OverrideDomain } from "@/components/admin/crewMappingTables";

type Table = OverrideDomain;
type Row = Record<string, unknown>;
type Unit = { id: string; type: string; name: string; parentId: string | null };

// DEC-011: a mapping page = Company→Crew scope panel + one editor. The scope selection decides what
// you edit: "All" everywhere → the governed Global config; a specific Crew → that crew's opt-in
// (admin-approved) override of the same table.
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
  scopeType = "CREW",
  scopeName,
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
  scopeType?: "APP" | "COMPANY" | "CREW";
  scopeName?: string;
  override: { status: string; version: number; rows: Row[] } | null;
  canEditGlobal: boolean;
  canWriteCrew: boolean;
  canApprove: boolean;
}) {
  const router = useRouter();
  const editingGlobal = !activeCrewId;
  const isApproved = override?.status === "APPROVED";
  const isRequested = override?.status === "REQUESTED";
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const crewName = scopeName ?? crews.find((c) => c.id === activeCrewId)?.name ?? "—";
  const scopeLabel = scopeType === "COMPANY" ? `Company · ${crewName}` : crewName;

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
          <div className="flex items-center gap-2 text-sm">
            <span className="text-[var(--muted)]">Editing:</span>
            {editingGlobal ? (
              <span className="rounded-full bg-[var(--panel-2)] px-2.5 py-0.5 font-medium text-[var(--navy)]">Application · all</span>
            ) : (
              <span className="rounded-full bg-[var(--panel-2)] px-2.5 py-0.5 font-medium text-[var(--navy)]">{scopeLabel}{isApproved ? " · specific" : ""}</span>
            )}
          </div>

          {editingGlobal ? (
            <MappingEditor
              title={title}
              description={description}
              section={section}
              columns={columns}
              rows={globalRows}
              readOnly={!canEditGlobal}
              hideHeader
            />
          ) : isApproved ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                {canWriteCrew ? (
                  <button type="button" className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-sm text-[var(--muted)]" disabled={busy} onClick={revert}>
                    Revert to global
                  </button>
                ) : null}
                <span className="text-xs text-[var(--muted)]">v{override?.version} · cross-crew rollups compare in person-days</span>
              </div>
              <MappingEditor
                title={title}
                description={description}
                section={section}
                columns={columns}
                rows={override?.rows ?? []}
                seedRows={globalRows}
                crew={{ crewId: activeCrewId!, table }}
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
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2 rounded-lg bg-[var(--panel-2)] px-3 py-2 text-sm text-[var(--navy)]">
                <span>
                  {crewName} uses the governed global {title.toLowerCase()}.{" "}
                  {canApprove ? "Enable a crew-specific copy for this crew?" : "Opt into a crew-specific copy (admin-approved)?"}
                </span>
                {canWriteCrew ? (
                  <button type="button" className="btn-primary text-sm" disabled={busy} onClick={() => call("request")}>
                    {canApprove ? "Enable crew-specific" : "Request crew-specific"}
                  </button>
                ) : null}
              </div>
              <MappingEditor
                title={title}
                description={description}
                section={section}
                columns={columns}
                rows={globalRows}
                readOnly
                hideHeader
              />
            </div>
          )}

          {message ? <p className="text-sm text-[var(--navy)]">{message}</p> : null}
        </section>
      </div>
    </div>
  );
}
