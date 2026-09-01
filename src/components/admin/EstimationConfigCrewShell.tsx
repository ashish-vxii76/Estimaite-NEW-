"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CrewScopePanel } from "@/components/admin/CrewScopePanel";
import { EstimationConfigForm } from "@/components/admin/EstimationConfigForm";
import type { EstimationConfig } from "@/domain/estimation/types";

type Unit = { id: string; type: string; name: string; parentId: string | null };

// DEC-013 D3: only these Class-A fields are crew-tunable. Everything else in EstimationConfig stays
// governed-global (thresholds, rounding, Dev/QA split, multipliers) — shown read-only per crew.
const CLASS_A: { key: keyof EstimationConfig; label: string }[] = [
  { key: "aiMinPct", label: "AI productivity minimum" },
  { key: "aiMaxPct", label: "AI productivity maximum" },
  { key: "standardTeamSize", label: "Standard team size" },
  { key: "fullTeamRateUtilisationWarning", label: "Full team rate utilisation (ratio)" },
];

const GOVERNED_GLOBAL = [
  "Sprint working days",
  "Issue / Epic review, split & decompose thresholds",
  "Index review / split minimums",
  "Complexity effort multipliers",
  "Dev/QA split, rounding, dashboard & calibration minimums",
];

export function EstimationConfigCrewShell({
  config,
  units,
  lockedUnitIds,
  crews,
  activeCrewId,
  override,
  canEditGlobal,
  canWriteCrew,
  canApprove,
}: {
  config: EstimationConfig;
  units: Unit[];
  lockedUnitIds: string[];
  crews: { id: string; name: string }[];
  activeCrewId: string | null;
  override: { status: string; version: number; fields: Record<string, number> } | null;
  canEditGlobal: boolean;
  canWriteCrew: boolean;
  canApprove: boolean;
}) {
  const router = useRouter();
  const editingGlobal = !activeCrewId;
  const isApproved = override?.status === "APPROVED";
  const isRequested = override?.status === "REQUESTED";
  const crewName = crews.find((c) => c.id === activeCrewId)?.name ?? "—";

  const globalVals = Object.fromEntries(CLASS_A.map((f) => [f.key, config[f.key] as number]));
  const [vals, setVals] = useState<Record<string, number>>({ ...globalVals, ...(override?.fields ?? {}) });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setVals({ ...globalVals, ...(override?.fields ?? {}) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [override, activeCrewId]);

  async function call(action: string, extra: Record<string, unknown> = {}) {
    if (!activeCrewId) return;
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/crew-mappings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, table: "ESTIMATION_CONFIG", crewId: activeCrewId, ...extra }),
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
    if (!window.confirm(`Revert ${crewName} to global estimation config?`)) return;
    await call("revert");
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-semibold text-[var(--navy)]">Estimation Config</h1>
        <p className="mt-1 max-w-3xl text-sm text-[var(--muted)]">
          Global thresholds from the Excel estimator. A crew may tune a small set of planning inputs;
          governed mechanics (thresholds, rounding, multipliers) stay global. Publishing is version-pinned.
        </p>
      </div>

      <div className="flex flex-wrap items-start gap-4">
        <CrewScopePanel units={units} lockedUnitIds={lockedUnitIds} activeCrewId={activeCrewId} />

        <section className="min-w-[340px] flex-1 space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-[var(--muted)]">Editing:</span>
            <span className="rounded-full bg-[var(--panel-2)] px-2.5 py-0.5 font-medium text-[var(--navy)]">
              {editingGlobal ? "Global · all crews" : `${crewName}${isApproved ? " · crew-specific" : ""}`}
            </span>
          </div>

          {editingGlobal ? (
            <EstimationConfigForm config={config} readOnly={!canEditGlobal} />
          ) : isApproved ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                {canWriteCrew ? (
                  <>
                    <button type="button" className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-sm text-[var(--navy)]" onClick={() => setVals({ ...globalVals })}>Copy from global</button>
                    <button type="button" className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-sm text-[var(--muted)]" disabled={busy} onClick={revert}>Revert to global</button>
                  </>
                ) : null}
                <span className="text-xs text-[var(--muted)]">Crew-specific · v{override?.version}</span>
              </div>
              <section className="card grid gap-4 p-5 md:grid-cols-2">
                {CLASS_A.map((f) => (
                  <label key={String(f.key)} className="text-sm">
                    {f.label}
                    <input
                      type="number"
                      step="any"
                      className="mt-1 w-full rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-3 py-2"
                      value={vals[f.key as string] ?? 0}
                      disabled={!canWriteCrew}
                      onChange={(e) => setVals((v) => ({ ...v, [f.key as string]: Number(e.target.value) }))}
                    />
                    <span className="mt-1 block text-[11px] text-[var(--muted)]">global: {String(config[f.key])}</span>
                  </label>
                ))}
              </section>
              {canWriteCrew ? (
                <button type="button" className="btn-primary" disabled={busy} onClick={() => call("save", { fields: vals })}>Save for {crewName}</button>
              ) : null}
              <GovernedPanel />
            </div>
          ) : isRequested ? (
            <div className="flex flex-wrap items-center gap-2 rounded-lg bg-[var(--panel-2)] px-3 py-2 text-sm text-[var(--navy)]">
              <span>Crew-specific estimation config requested — pending administrator approval.</span>
              {canApprove ? <button type="button" className="btn-primary text-sm" disabled={busy} onClick={() => call("approve")}>Approve</button> : null}
              {canWriteCrew ? <button type="button" className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-sm text-[var(--muted)]" disabled={busy} onClick={revert}>Cancel request</button> : null}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2 rounded-lg bg-[var(--panel-2)] px-3 py-2 text-sm text-[var(--navy)]">
                <span>{crewName} uses the governed global estimation config. {canApprove ? "Enable a crew-specific copy?" : "Opt into a crew-specific copy (admin-approved)?"}</span>
                {canWriteCrew ? <button type="button" className="btn-primary text-sm" disabled={busy} onClick={() => call("request")}>{canApprove ? "Enable crew-specific" : "Request crew-specific"}</button> : null}
              </div>
              <GovernedPanel />
            </div>
          )}

          {message ? <p className="text-sm text-[var(--navy)]">{message}</p> : null}
        </section>
      </div>
    </div>
  );
}

function GovernedPanel() {
  return (
    <section className="card p-5">
      <h2 className="font-medium text-[var(--navy)]">Governed globally (read-only)</h2>
      <p className="mt-1 max-w-3xl text-sm text-[var(--muted)]">
        These stay the same for every crew — not per-crew editable — so the engine stays governed and
        estimates comparable.
      </p>
      <ul className="mt-3 grid gap-2 text-sm text-[var(--navy)] sm:grid-cols-2">
        {GOVERNED_GLOBAL.map((g) => (
          <li key={g} className="rounded-lg border border-[var(--line)] px-3 py-2">{g}</li>
        ))}
      </ul>
    </section>
  );
}
