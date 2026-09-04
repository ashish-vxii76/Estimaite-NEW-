"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CrewScopePanel } from "@/components/admin/CrewScopePanel";
import { formatMoney } from "@/lib/utils";

type Unit = { id: string; type: string; name: string; parentId: string | null };
type Budget = {
  id: string;
  crewId: string;
  crewName: string;
  year: number;
  amount: number;
  pendingAmount: number | null;
  status: string;
  currency: string;
};

const ORG_ORDER = ["COMPANY", "DIVISION", "SUB_DIVISION", "STREAM"] as const;

export function CrewBudgetsWorkspace({
  units,
  lockedUnitIds,
  crews,
  activeCrewId,
  activeScopeType,
  activeScopeName,
  budgets,
  releaseYears,
  activeCrewCurrency,
  canWrite,
  canApprove,
}: {
  units: Unit[];
  lockedUnitIds: string[];
  crews: { id: string; name: string }[];
  activeCrewId: string | null;
  activeScopeType: "APP" | "COMPANY" | "CREW";
  activeScopeName: string;
  budgets: Budget[];
  releaseYears: number[];
  activeCrewCurrency: string;
  canWrite: boolean;
  canApprove: boolean;
}) {
  const router = useRouter();
  const byId = useMemo(() => new Map(units.map((u) => [u.id, u])), [units]);
  const editingCrew = activeScopeType === "CREW" && activeCrewId != null;

  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function call(body: Record<string, unknown>, method: "POST" | "DELETE" = "POST", qs = "") {
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch(`/api/admin/crew-budgets${qs}`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: method === "DELETE" ? undefined : JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Action failed");
      router.refresh();
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-semibold text-[var(--navy)]">Crew yearly budgets</h1>
        <p className="mt-1 max-w-3xl text-sm text-[var(--muted)]">
          Budget is owned at Crew level in the company&apos;s currency, yearly; higher levels are per-currency sums. Changes are governed:
          a create or edit needs approval by an admin or the crew&apos;s Tech Lead before it counts —
          until then the previously approved amount stands. Pick a crew to manage its budgets.
        </p>
      </div>

      <div className="flex flex-wrap items-start gap-4">
        <CrewScopePanel units={units} lockedUnitIds={lockedUnitIds} activeCrewId={activeCrewId} />

        <section className="min-w-[340px] flex-1 space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-[var(--muted)]">Scope:</span>
            <span className="rounded-full bg-[var(--panel-2)] px-2.5 py-0.5 font-medium text-[var(--navy)]">
              {editingCrew ? `Crew · ${activeScopeName}` : activeScopeType === "COMPANY" ? `Company · ${activeScopeName}` : "Application · all"}
            </span>
          </div>

          {editingCrew ? (
            <CrewEditor
              crewId={activeCrewId!}
              crewName={activeScopeName}
              currency={activeCrewCurrency}
              budgets={budgets.filter((b) => b.crewId === activeCrewId)}
              releaseYears={releaseYears}
              canWrite={canWrite}
              canApprove={canApprove}
              busy={busy}
              onSave={(year, amount, allowUpdate) => call({ action: "save", crewId: activeCrewId, year, amount, allowUpdate })}
              onApprove={(id) => call({ action: "approve", id })}
              onDiscard={(id) => call({ action: "discard", id })}
              onDelete={(id) => call({}, "DELETE", `?id=${encodeURIComponent(id)}`)}
            />
          ) : (
            <RollupTable units={byId} budgets={budgets} releaseYears={releaseYears} />
          )}

          {message ? <p className="text-sm text-[var(--navy)]">{message}</p> : null}
        </section>
      </div>
    </div>
  );
}

function StatusBadge({ b }: { b: Budget }) {
  if (b.status === "PENDING") {
    return <span className="chip-warn rounded-full px-2 py-0.5 text-[11px] font-medium">Pending approval</span>;
  }
  if (b.pendingAmount != null) {
    return <span className="chip-warn rounded-full px-2 py-0.5 text-[11px] font-medium">Change pending</span>;
  }
  return <span className="chip-ok rounded-full px-2 py-0.5 text-[11px] font-medium">Approved</span>;
}

function CrewEditor({
  crewName,
  currency,
  budgets,
  releaseYears,
  canWrite,
  canApprove,
  busy,
  onSave,
  onApprove,
  onDiscard,
  onDelete,
}: {
  crewId: string;
  crewName: string;
  currency: string;
  budgets: Budget[];
  releaseYears: number[];
  canWrite: boolean;
  canApprove: boolean;
  busy: boolean;
  onSave: (year: number, amount: number, allowUpdate: boolean) => void;
  onApprove: (id: string) => void;
  onDiscard: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const usedYears = useMemo(() => new Set(budgets.map((b) => b.year)), [budgets]);
  const availableYears = useMemo(
    () => releaseYears.filter((y) => !usedYears.has(y)),
    [releaseYears, usedYears],
  );
  const rows = useMemo(() => [...budgets].sort((a, b) => b.year - a.year), [budgets]);

  const [newYear, setNewYear] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState("");

  const SEL = "mt-1 w-full rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-3 py-2 text-sm text-[var(--navy)]";

  return (
    <div className="space-y-4">
      {canWrite ? (
        <section className="card space-y-3 p-5">
          <h2 className="font-medium text-[var(--navy)]">Add a budget for {crewName}</h2>
          {availableYears.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">
              Every release year already has a budget for this crew — edit an existing row below.
            </p>
          ) : (
            <div className="flex flex-wrap items-end gap-3">
              <label className="text-sm">
                <span className="block">Year</span>
                <select className={SEL} value={newYear} onChange={(e) => setNewYear(e.target.value)}>
                  <option value="">Select a year</option>
                  {availableYears.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                <span className="block">Amount ({currency})</span>
                <input
                  type="number"
                  min={0}
                  className="mt-1 block w-40 rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-3 py-2 text-sm"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                />
              </label>
              <button
                type="button"
                className="btn-primary"
                disabled={busy || !newYear || newAmount === ""}
                onClick={() => { onSave(Number(newYear), Number(newAmount), false); setNewYear(""); setNewAmount(""); }}
              >
                {canApprove ? "Add budget" : "Submit for approval"}
              </button>
            </div>
          )}
          {!canApprove ? (
            <p className="text-[11.5px] text-[var(--muted)]">
              You can submit budgets; an admin or the Crew Tech Lead approves before they take effect.
            </p>
          ) : null}
        </section>
      ) : null}

      <section className="card overflow-x-auto p-5">
        <h2 className="mb-3 font-medium text-[var(--navy)]">Budgets · {crewName}</h2>
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="text-xs uppercase text-[var(--muted)]">
            <tr>
              <th className="py-2">Year</th>
              <th className="py-2">Amount</th>
              <th className="py-2">Status</th>
              {canWrite ? <th className="py-2 text-right">Actions</th> : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((b) => {
              const hasPending = b.status === "PENDING" || b.pendingAmount != null;
              return (
                <tr key={b.id} className="border-t border-[var(--line)] align-top">
                  <td className="py-2 font-medium">{b.year}</td>
                  <td className="py-2">
                    {editingId === b.id ? (
                      <input
                        type="number"
                        min={0}
                        autoFocus
                        className="w-32 rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-2 py-1"
                        value={editAmount}
                        onChange={(e) => setEditAmount(e.target.value)}
                      />
                    ) : (
                      <div>
                        <span>{formatMoney(b.amount, b.currency)}</span>
                        {b.status === "PENDING" ? <span className="ml-1 text-[11px] text-[var(--muted)]">(proposed)</span> : null}
                        {b.pendingAmount != null ? (
                          <span className="ml-1 text-[11px] text-[var(--warn,#b7791f)]">→ {formatMoney(b.pendingAmount, b.currency)} pending</span>
                        ) : null}
                      </div>
                    )}
                  </td>
                  <td className="py-2"><StatusBadge b={b} /></td>
                  {canWrite ? (
                    <td className="py-2 text-right">
                      {editingId === b.id ? (
                        <span className="inline-flex gap-3">
                          <button className="text-[var(--navy)] underline disabled:opacity-40" disabled={busy || editAmount === ""} onClick={() => { onSave(b.year, Number(editAmount), true); setEditingId(null); }}>Save</button>
                          <button className="text-[var(--muted)] underline" onClick={() => setEditingId(null)}>Cancel</button>
                        </span>
                      ) : (
                        <span className="inline-flex flex-wrap justify-end gap-3">
                          <button className="text-[var(--navy)] underline" onClick={() => { setEditingId(b.id); setEditAmount(String(b.pendingAmount ?? b.amount)); }}>Edit</button>
                          {hasPending && canApprove ? (
                            <button className="text-[var(--success,#2f855a)] underline" disabled={busy} onClick={() => onApprove(b.id)}>Approve</button>
                          ) : null}
                          {hasPending ? (
                            <button className="text-[var(--muted)] underline" disabled={busy} onClick={() => onDiscard(b.id)}>Discard change</button>
                          ) : (
                            <button className="text-[var(--danger)] underline" disabled={busy} onClick={() => { if (window.confirm(`Delete the ${b.year} budget for ${crewName}?`)) onDelete(b.id); }}>Delete</button>
                          )}
                        </span>
                      )}
                    </td>
                  ) : null}
                </tr>
              );
            })}
            {rows.length === 0 ? (
              <tr><td colSpan={canWrite ? 4 : 3} className="py-4 text-[var(--muted)]">No budgets yet for {crewName}.</td></tr>
            ) : null}
          </tbody>
        </table>
        <p className="mt-3 text-sm font-semibold text-[var(--navy)]">
          Approved total: {formatMoney(rows.filter((b) => b.status === "APPROVED").reduce((s, b) => s + b.amount, 0), currency)}
        </p>
      </section>
    </div>
  );
}

function RollupTable({
  units,
  budgets,
  releaseYears,
}: {
  units: Map<string, Unit>;
  budgets: Budget[];
  releaseYears: number[];
}) {
  const [year, setYear] = useState(""); // "" = All (default)

  function pathOf(crewId: string) {
    const out: Record<string, string> = { COMPANY: "—", DIVISION: "—", SUB_DIVISION: "—", STREAM: "—" };
    let cur = units.get(crewId);
    cur = cur?.parentId ? units.get(cur.parentId) : undefined;
    while (cur) {
      out[cur.type] = cur.name;
      cur = cur.parentId ? units.get(cur.parentId) : undefined;
    }
    return out;
  }

  const rows = useMemo(() => {
    const filtered = year ? budgets.filter((b) => b.year === Number(year)) : budgets;
    return filtered
      .map((b) => ({ b, path: pathOf(b.crewId) }))
      .sort((a, z) =>
        (a.path.COMPANY + a.path.DIVISION + a.path.SUB_DIVISION + a.path.STREAM + a.b.crewName + a.b.year).localeCompare(
          z.path.COMPANY + z.path.DIVISION + z.path.SUB_DIVISION + z.path.STREAM + z.b.crewName + z.b.year,
        ),
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [budgets, year]);

  // Roll-up spans companies/currencies — sum PER currency, never into one figure (no FX).
  const totalsByCcy = useMemo(() => {
    const m: Record<string, number> = {};
    for (const r of rows) {
      if (r.b.status === "APPROVED") m[r.b.currency] = (m[r.b.currency] ?? 0) + r.b.amount;
    }
    return m;
  }, [rows]);

  return (
    <section className="card overflow-x-auto p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-medium text-[var(--navy)]">Budget roll-up</h2>
        <label className="text-sm text-[var(--muted)]">
          Year{" "}
          <select
            className="rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-2 py-1 text-sm text-[var(--navy)]"
            value={year}
            onChange={(e) => setYear(e.target.value)}
          >
            <option value="">All</option>
            {releaseYears.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </label>
      </div>
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="text-xs uppercase text-[var(--muted)]">
          <tr>
            <th className="py-2">Company</th>
            <th className="py-2">Division</th>
            <th className="py-2">Sub-Division</th>
            <th className="py-2">Stream</th>
            <th className="py-2">Crew</th>
            <th className="py-2">Year</th>
            <th className="py-2 text-right">Budget (approved)</th>
            <th className="py-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ b, path }) => (
            <tr key={b.id} className="border-t border-[var(--line)]">
              <td className="py-2">{path.COMPANY}</td>
              <td className="py-2">{path.DIVISION}</td>
              <td className="py-2">{path.SUB_DIVISION}</td>
              <td className="py-2">{path.STREAM}</td>
              <td className="py-2 font-medium">{b.crewName}</td>
              <td className="py-2">{b.year}</td>
              <td className="py-2 text-right">{b.status === "APPROVED" ? formatMoney(b.amount, b.currency) : "—"}</td>
              <td className="py-2"><StatusBadge b={b} /></td>
            </tr>
          ))}
          {rows.length === 0 ? (
            <tr><td colSpan={8} className="py-4 text-[var(--muted)]">No budgets in scope{year ? ` for ${year}` : ""}.</td></tr>
          ) : null}
        </tbody>
      </table>
      <p className="mt-3 text-sm font-semibold text-[var(--navy)]">
        Approved total{year ? ` · ${year}` : ""}:{" "}
        {Object.keys(totalsByCcy).length === 0
          ? "—"
          : Object.entries(totalsByCcy)
              .map(([ccy, v]) => formatMoney(v, ccy))
              .join("  ·  ")}
      </p>
      <p className="mt-1 text-[11.5px] text-[var(--muted)]">
        Totals are per currency — budgets are held in each company&apos;s currency and never summed across currencies. Pick a crew on the left to add or edit its budgets.
      </p>
    </section>
  );
}
