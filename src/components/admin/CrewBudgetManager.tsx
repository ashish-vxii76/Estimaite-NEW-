"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatMoney } from "@/lib/utils";

type Unit = { id: string; type: string; name: string; parentId: string | null; active: boolean };
type BudgetRow = {
  id: string;
  year: number;
  amount: number;
  currency: string;
  crewId: string;
  crew: { id: string; name: string };
};

const SEL = "mt-1 w-full rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-3 py-2 text-sm text-[var(--navy)]";

export function CrewBudgetManager({
  initialBudgets,
  units,
  canWrite,
  defaultYear,
  releaseYears,
}: {
  initialBudgets: BudgetRow[];
  units: Unit[];
  canWrite: boolean;
  defaultYear: number;
  releaseYears: number[];
}) {
  const router = useRouter();
  const [budgets, setBudgets] = useState(initialBudgets);
  const [year, setYear] = useState(defaultYear);
  const [showForm, setShowForm] = useState(false);
  const [companyId, setCompanyId] = useState("");
  const [divisionId, setDivisionId] = useState("");
  const [subId, setSubId] = useState("");
  const [streamId, setStreamId] = useState("");
  const [crewId, setCrewId] = useState("");
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  // per-row inline edit
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState("");

  const companies = units.filter((u) => u.type === "COMPANY" && u.active);
  const divisions = units.filter((u) => u.type === "DIVISION" && u.active && u.parentId === companyId);
  const subs = units.filter((u) => u.type === "SUB_DIVISION" && u.active && u.parentId === divisionId);
  const streams = units.filter((u) => u.type === "STREAM" && u.active && u.parentId === subId);
  const crews = units.filter((u) => u.type === "CREW" && u.active && u.parentId === streamId);

  const yearBudgets = useMemo(
    () => budgets.filter((b) => b.year === year).sort((a, b) => a.crew.name.localeCompare(b.crew.name)),
    [budgets, year],
  );

  async function reload(y = year) {
    const res = await fetch(`/api/admin/crew-budgets?year=${y}`);
    const data = await res.json();
    if (res.ok) setBudgets(data.budgets);
    router.refresh();
  }

  function resetForm() {
    setCompanyId("");
    setDivisionId("");
    setSubId("");
    setStreamId("");
    setCrewId("");
    setAmount("");
  }

  async function addBudget() {
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/crew-budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ crewId, year, amount: Number(amount), allowUpdate: false }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      setMessage(`Added ${data.budget.crew.name} · ${year}`);
      resetForm();
      setShowForm(false);
      await reload();
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit(row: BudgetRow) {
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/crew-budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ crewId: row.crewId, year: row.year, amount: Number(editAmount), allowUpdate: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Update failed");
      setMessage(`Updated ${row.crew.name} · ${row.year}`);
      setEditingId(null);
      await reload();
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(row: BudgetRow) {
    if (!window.confirm(`Delete the ${row.year} budget for ${row.crew.name}? This cannot be undone.`)) return;
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch(`/api/admin/crew-budgets?id=${encodeURIComponent(row.id)}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Delete failed");
      }
      setMessage(`Deleted ${row.crew.name} · ${row.year}`);
      await reload();
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="kicker">Organisation</p>
        <h1 className="font-display text-2xl font-semibold text-[var(--navy)]">Crew yearly budgets</h1>
        <p className="mt-1 max-w-3xl text-sm text-[var(--muted)]">
          Budget is owned only at Crew (CHF, yearly). Higher levels are sums. Duplicate Crew+year is
          blocked — edit the existing row instead. Aligns with estimate Release year.
        </p>
      </header>

      {/* New Crew Budget form (revealed by the button) */}
      {canWrite && showForm ? (
        <section className="card space-y-3 p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-medium text-[var(--navy)]">New crew budget</h2>
            <button type="button" className="text-sm text-[var(--muted)] underline" onClick={() => { setShowForm(false); resetForm(); }}>
              Cancel
            </button>
          </div>
          <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
            <label className="text-sm">
              Year
              <select className={SEL} value={year} onChange={(e) => { const y = Number(e.target.value); setYear(y); void reload(y); }}>
                {(releaseYears.length ? releaseYears : [defaultYear]).map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              Company
              <select className={SEL} value={companyId} onChange={(e) => { setCompanyId(e.target.value); setDivisionId(""); setSubId(""); setStreamId(""); setCrewId(""); }}>
                <option value="">Select</option>
                {companies.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
              </select>
            </label>
            <label className="text-sm">
              Division
              <select className={SEL} value={divisionId} disabled={!companyId} onChange={(e) => { setDivisionId(e.target.value); setSubId(""); setStreamId(""); setCrewId(""); }}>
                <option value="">Select</option>
                {divisions.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
              </select>
            </label>
            <label className="text-sm">
              Sub-Division
              <select className={SEL} value={subId} disabled={!divisionId} onChange={(e) => { setSubId(e.target.value); setStreamId(""); setCrewId(""); }}>
                <option value="">Select</option>
                {subs.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
              </select>
            </label>
            <label className="text-sm">
              Stream
              <select className={SEL} value={streamId} disabled={!subId} onChange={(e) => { setStreamId(e.target.value); setCrewId(""); }}>
                <option value="">Select</option>
                {streams.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
              </select>
            </label>
            <label className="text-sm">
              Crew
              <select className={SEL} value={crewId} disabled={!streamId} onChange={(e) => setCrewId(e.target.value)}>
                <option value="">Select</option>
                {crews.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
              </select>
            </label>
          </div>
          <label className="block text-sm">
            Amount (CHF)
            <input type="number" min={0} className="mt-1 w-full max-w-xs rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-3 py-2" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </label>
          <button type="button" className="btn-primary" disabled={busy || !crewId || amount === ""} onClick={addBudget}>
            Save budget
          </button>
        </section>
      ) : null}

      <section className="card overflow-x-auto p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-medium text-[var(--navy)]">Budgets · {year}</h2>
          <div className="flex items-center gap-2">
            <label className="text-sm text-[var(--muted)]">
              Year{" "}
              <select
                className="rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-2 py-1 text-sm text-[var(--navy)]"
                value={year}
                onChange={(e) => { const y = Number(e.target.value); setYear(y); setEditingId(null); void reload(y); }}
              >
                {(releaseYears.length ? releaseYears : [defaultYear]).map((y) => (<option key={y} value={y}>{y}</option>))}
              </select>
            </label>
            {canWrite ? (
              <button type="button" className="btn-primary text-sm" onClick={() => { setShowForm(true); setMessage(""); }}>
                + New Crew Budget
              </button>
            ) : null}
          </div>
        </div>

        <table className="mt-3 w-full min-w-[560px] text-left text-sm">
          <thead className="text-xs uppercase text-[var(--muted)]">
            <tr>
              <th className="py-2">Crew</th>
              <th className="py-2">Year</th>
              <th className="py-2">Amount</th>
              {canWrite ? <th className="py-2 text-right">Actions</th> : null}
            </tr>
          </thead>
          <tbody>
            {yearBudgets.map((b) => (
              <tr key={b.id} className="border-t border-[var(--line)]">
                <td className="py-2 font-medium">{b.crew.name}</td>
                <td className="py-2">{b.year}</td>
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
                    formatMoney(b.amount, "CHF")
                  )}
                </td>
                {canWrite ? (
                  <td className="py-2 text-right">
                    {editingId === b.id ? (
                      <span className="inline-flex gap-3">
                        <button className="text-[var(--navy)] underline disabled:opacity-40" disabled={busy || editAmount === ""} onClick={() => saveEdit(b)}>Save</button>
                        <button className="text-[var(--muted)] underline" onClick={() => setEditingId(null)}>Cancel</button>
                      </span>
                    ) : (
                      <span className="inline-flex gap-3">
                        <button className="text-[var(--navy)] underline" onClick={() => { setEditingId(b.id); setEditAmount(String(b.amount)); setMessage(""); }}>Edit</button>
                        <button className="text-[var(--danger)] underline" onClick={() => remove(b)}>Delete</button>
                      </span>
                    )}
                  </td>
                ) : null}
              </tr>
            ))}
            {yearBudgets.length === 0 ? (
              <tr>
                <td colSpan={canWrite ? 4 : 3} className="py-4 text-[var(--muted)]">
                  No crew budgets for {year}{canWrite ? " — add one with “+ New Crew Budget”." : "."}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
        <p className="mt-3 text-sm font-semibold text-[var(--navy)]">
          Total {year}: {formatMoney(yearBudgets.reduce((s, b) => s + b.amount, 0), "CHF")}
        </p>
        {message ? <p className="mt-2 text-sm text-[var(--navy)]">{message}</p> : null}
        {!canWrite ? <p className="mt-2 text-sm text-[var(--muted)]">Read only for this role.</p> : null}
      </section>
    </div>
  );
}
