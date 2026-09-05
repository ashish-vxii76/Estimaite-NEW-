"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CrewScopePanel } from "@/components/admin/CrewScopePanel";
import { ScopeFilterBar } from "@/components/ScopeFilterBar";
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
  requestedById: string | null;
};

type StatusFilter = "ALL" | "PENDING" | "APPROVED";

/** A budget with a pending create or a parked change is "awaiting approval". */
function isAwaiting(b: Budget) {
  return b.status === "PENDING" || b.pendingAmount != null;
}

export function CrewBudgetsWorkspace({
  mode,
  statusFilter,
  units,
  lockedUnitIds,
  activeCrewId,
  activeScopeType,
  activeScopeName,
  budgets,
  releaseYears,
  activeCrewCurrency,
  approverCrewIds,
  currentUserId,
  canWrite,
  filters,
}: {
  mode: "queue" | "editor";
  statusFilter: StatusFilter;
  units: Unit[];
  lockedUnitIds: string[];
  crews: { id: string; name: string }[];
  activeCrewId: string | null;
  activeScopeType: "APP" | "COMPANY" | "CREW";
  activeScopeName: string;
  budgets: Budget[];
  releaseYears: number[];
  activeCrewCurrency: string;
  approverCrewIds: string[];
  currentUserId: string;
  canWrite: boolean;
  filters: { org: string; status: string; year: string };
}) {
  const router = useRouter();
  const byId = useMemo(() => new Map(units.map((u) => [u.id, u])), [units]);
  const approverSet = useMemo(() => new Set(approverCrewIds), [approverCrewIds]);
  const editingCrew = activeScopeType === "CREW" && activeCrewId != null;
  const canApproveActive = editingCrew && activeCrewId != null && approverSet.has(activeCrewId);

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

  // Standardised filter drawer (identical contract to the Estimates register): org cascade to Crew,
  // release year and status. Budgets are crew-level so the Pod/Team rung and the work-type/quarter
  // section are hidden. Year + status ride as generic extra filters (URL-driven).
  const extraFilters = [
    {
      label: "Release year",
      param: "year",
      value: filters.year,
      clearValue: "",
      options: [{ value: "", label: "All years" }, ...releaseYears.map((y) => ({ value: String(y), label: String(y) }))],
    },
    {
      label: "Status",
      param: "status",
      value: filters.status,
      clearValue: "",
      options: [
        { value: "", label: "All statuses" },
        { value: "PENDING", label: "Awaiting approval" },
        { value: "APPROVED", label: "Approved" },
      ],
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="kicker">Governed budgets</p>
          <h1 className="font-display text-2xl font-semibold text-[var(--navy)]">Crew yearly budgets</h1>
        </div>
        {mode === "queue" && canWrite ? (
          <Link href="/crew-budgets?new=1" className="btn-primary">
            New crew budget
          </Link>
        ) : null}
      </div>
      <p className="max-w-3xl text-sm text-[var(--muted)]">
        Budget is owned at Crew level in each company&apos;s currency, yearly; higher levels are per-currency
        sums. Every create or edit is governed: it stays <em>awaiting approval</em> until a different eligible
        approver (an admin, or the crew&apos;s Tech/Product Lead) promotes it — the previously approved amount
        stands until then.
      </p>

      {mode === "editor" ? (
        <div className="space-y-4">
          <Link href="/crew-budgets" className="inline-block text-sm text-[var(--navy)] underline">
            ← Back to all budgets
          </Link>
          <div className="flex flex-wrap items-start gap-4">
            <CrewScopePanel units={units} lockedUnitIds={lockedUnitIds} activeCrewId={activeCrewId} />
            <section className="min-w-[340px] flex-1 space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-[var(--muted)]">Scope:</span>
                <span className="rounded-full bg-[var(--panel-2)] px-2.5 py-0.5 font-medium text-[var(--navy)]">
                  {editingCrew ? `Crew · ${activeScopeName}` : "Pick a crew to add or edit its budget"}
                </span>
              </div>
              {editingCrew ? (
                <CrewEditor
                  crewName={activeScopeName}
                  currency={activeCrewCurrency}
                  budgets={budgets.filter((b) => b.crewId === activeCrewId)}
                  releaseYears={releaseYears}
                  canWrite={canWrite}
                  canApprove={canApproveActive}
                  currentUserId={currentUserId}
                  busy={busy}
                  onSave={(year, amount, allowUpdate) => call({ action: "save", crewId: activeCrewId, year, amount, allowUpdate })}
                  onApprove={(id) => call({ action: "approve", id })}
                  onDiscard={(id) => call({ action: "discard", id })}
                  onDelete={(id) => call({}, "DELETE", `?id=${encodeURIComponent(id)}`)}
                />
              ) : (
                <p className="card p-5 text-sm text-[var(--muted)]">
                  Choose a crew in the cascade on the left to create or edit a yearly budget.
                </p>
              )}
              {message ? <p className="text-sm text-[var(--navy)]">{message}</p> : null}
            </section>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <ScopeFilterBar
            basePath="/crew-budgets"
            units={units}
            teams={[]}
            lockedUnitIds={lockedUnitIds}
            org={filters.org}
            team=""
            showTeam={false}
            showWorkRelease={false}
            extraFilters={extraFilters}
          />
          <QueueTable
            units={byId}
            budgets={budgets}
            statusFilter={statusFilter}
            approverSet={approverSet}
            currentUserId={currentUserId}
            canWrite={canWrite}
            busy={busy}
            onApprove={(id) => call({ action: "approve", id })}
            onDiscard={(id) => call({ action: "discard", id })}
          />
          {message ? <p className="text-sm text-[var(--navy)]">{message}</p> : null}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ b }: { b: Budget }) {
  const cls = "inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium";
  if (b.status === "PENDING") return <span className={`chip-warn ${cls}`}>Awaiting approval</span>;
  if (b.pendingAmount != null) return <span className={`chip-warn ${cls}`}>Change pending</span>;
  return <span className={`chip-ok ${cls}`}>Approved</span>;
}

/** Cross-crew, status-filtered approval queue — the "All / Awaiting approval / Approved" views. */
function QueueTable({
  units,
  budgets,
  statusFilter,
  approverSet,
  currentUserId,
  canWrite,
  busy,
  onApprove,
  onDiscard,
}: {
  units: Map<string, Unit>;
  budgets: Budget[];
  statusFilter: StatusFilter;
  approverSet: Set<string>;
  currentUserId: string;
  canWrite: boolean;
  busy: boolean;
  onApprove: (id: string) => void;
  onDiscard: (id: string) => void;
}) {
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

  // Rows arrive already filtered by the drawer (org / year / status), resolved server-side.
  const rows = useMemo(() => {
    return budgets
      .map((b) => ({ b, path: pathOf(b.crewId) }))
      .sort((a, z) =>
        (a.path.COMPANY + a.path.DIVISION + a.path.SUB_DIVISION + a.path.STREAM + a.b.crewName + a.b.year).localeCompare(
          z.path.COMPANY + z.path.DIVISION + z.path.SUB_DIVISION + z.path.STREAM + z.b.crewName + z.b.year,
        ),
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [budgets]);

  // Roll-up spans companies/currencies — sum PER currency, never into one figure (no FX).
  const totalsByCcy = useMemo(() => {
    const m: Record<string, number> = {};
    for (const r of rows) {
      if (r.b.status === "APPROVED") m[r.b.currency] = (m[r.b.currency] ?? 0) + r.b.amount;
    }
    return m;
  }, [rows]);

  const emptyLabel =
    statusFilter === "PENDING"
      ? "Nothing awaiting approval"
      : statusFilter === "APPROVED"
        ? "No approved budgets"
        : "No budgets in scope";

  return (
    <section className="card overflow-x-auto p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-medium text-[var(--navy)]">
          {statusFilter === "PENDING" ? "Awaiting approval" : statusFilter === "APPROVED" ? "Approved budgets" : "All crew budgets"}
        </h2>
        <span className="text-sm text-[var(--muted)]">{rows.length} {rows.length === 1 ? "budget" : "budgets"}</span>
      </div>
      <table className="w-full min-w-[900px] text-left text-sm [&_td]:px-3 [&_td]:py-3 [&_td]:align-top [&_th]:px-3 [&_th]:py-2">
        <thead className="text-xs uppercase text-[var(--muted)]">
          <tr>
            <th>Company</th>
            <th>Division</th>
            <th>Sub-Division</th>
            <th>Stream</th>
            <th>Crew</th>
            <th>Year</th>
            <th className="text-right">Amount</th>
            <th>Status</th>
            <th className="text-right">Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ b, path }) => {
            const awaiting = isAwaiting(b);
            const isMaker = b.requestedById != null && b.requestedById === currentUserId;
            const mayApprove = awaiting && approverSet.has(b.crewId) && !isMaker;
            return (
              <tr key={b.id} className="border-t border-[var(--line)] align-top">
                <td className="py-2">{path.COMPANY}</td>
                <td className="py-2">{path.DIVISION}</td>
                <td className="py-2">{path.SUB_DIVISION}</td>
                <td className="py-2">{path.STREAM}</td>
                <td className="py-2 font-medium">{b.crewName}</td>
                <td className="py-2">{b.year}</td>
                <td className="whitespace-nowrap text-right">
                  {b.status === "APPROVED" ? formatMoney(b.amount, b.currency) : b.status === "PENDING" ? (
                    <span>{formatMoney(b.amount, b.currency)} <span className="text-[11px] text-[var(--muted)]">(proposed)</span></span>
                  ) : "—"}
                  {b.pendingAmount != null ? (
                    <div className="text-[11px] text-[var(--warn,#b7791f)]">→ {formatMoney(b.pendingAmount, b.currency)} pending</div>
                  ) : null}
                </td>
                <td><StatusBadge b={b} /></td>
                <td className="text-right">
                  {mayApprove ? (
                    <span className="inline-flex flex-wrap justify-end gap-3">
                      <button className="text-[var(--success,#2f855a)] underline disabled:opacity-40" disabled={busy} onClick={() => onApprove(b.id)}>Approve</button>
                      <button className="text-[var(--muted)] underline disabled:opacity-40" disabled={busy} onClick={() => onDiscard(b.id)}>Discard</button>
                    </span>
                  ) : awaiting && isMaker ? (
                    <span className="text-[11px] text-[var(--muted)]">You submitted — needs another approver</span>
                  ) : awaiting ? (
                    <span className="text-[11px] text-[var(--muted)]">Awaiting an approver</span>
                  ) : canWrite ? (
                    <Link href={`/crew-budgets?crew=${encodeURIComponent(b.crewId)}`} className="text-[var(--navy)] underline">Edit</Link>
                  ) : null}
                </td>
              </tr>
            );
          })}
          {rows.length === 0 ? (
            <tr><td colSpan={9} className="py-4 text-[var(--muted)]">{emptyLabel} in this filter.</td></tr>
          ) : null}
        </tbody>
      </table>
      <p className="mt-3 text-sm font-semibold text-[var(--navy)]">
        Approved total:{" "}
        {Object.keys(totalsByCcy).length === 0
          ? "—"
          : Object.entries(totalsByCcy)
              .map(([ccy, v]) => formatMoney(v, ccy))
              .join("  ·  ")}
      </p>
      <p className="mt-1 text-[11.5px] text-[var(--muted)]">
        Totals are per currency — budgets are held in each company&apos;s currency and never summed across
        currencies. Only approved budgets count in roll-ups.
      </p>
    </section>
  );
}

function CrewEditor({
  crewName,
  currency,
  budgets,
  releaseYears,
  canWrite,
  canApprove,
  currentUserId,
  busy,
  onSave,
  onApprove,
  onDiscard,
  onDelete,
}: {
  crewName: string;
  currency: string;
  budgets: Budget[];
  releaseYears: number[];
  canWrite: boolean;
  canApprove: boolean;
  currentUserId: string;
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
                Submit for approval
              </button>
            </div>
          )}
          <p className="text-[11.5px] text-[var(--muted)]">
            A new or changed budget is submitted for approval. Maker ≠ checker: it must be approved by a
            different eligible approver{canApprove ? " (you can approve others’ submissions here)" : ""}.
          </p>
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
              const awaiting = isAwaiting(b);
              const isMaker = b.requestedById != null && b.requestedById === currentUserId;
              const mayApprove = awaiting && canApprove && !isMaker;
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
                          {mayApprove ? (
                            <button className="text-[var(--success,#2f855a)] underline" disabled={busy} onClick={() => onApprove(b.id)}>Approve</button>
                          ) : awaiting && isMaker ? (
                            <span className="text-[11px] text-[var(--muted)]">needs another approver</span>
                          ) : null}
                          {awaiting ? (
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
