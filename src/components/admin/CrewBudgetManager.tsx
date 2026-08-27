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
  const [companyId, setCompanyId] = useState("");
  const [divisionId, setDivisionId] = useState("");
  const [subId, setSubId] = useState("");
  const [streamId, setStreamId] = useState("");
  const [crewId, setCrewId] = useState("");
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

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

  async function save(allowUpdate: boolean) {
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/crew-budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          crewId,
          year,
          amount: Number(amount),
          allowUpdate,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      setMessage(
        allowUpdate
          ? `Updated ${data.budget.crew.name} ${year}`
          : `Saved ${data.budget.crew.name} ${year}`,
      );
      setAmount("");
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
          blocked — update the existing row instead. Aligns with estimate Release year.
        </p>
      </header>

      <section className="card space-y-3 p-5">
        <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
          <label className="text-sm">
            Year
            <select
              className="mt-1 w-full rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-3 py-2 text-[var(--navy)]"
              value={year}
              onChange={(e) => {
                const y = Number(e.target.value);
                setYear(y);
                void reload(y);
              }}
            >
              {(releaseYears.length ? releaseYears : [defaultYear]).map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Company
            <select
              className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2"
              value={companyId}
              onChange={(e) => {
                setCompanyId(e.target.value);
                setDivisionId("");
                setSubId("");
                setStreamId("");
                setCrewId("");
              }}
            >
              <option value="">Select</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Division
            <select
              className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2"
              value={divisionId}
              disabled={!companyId}
              onChange={(e) => {
                setDivisionId(e.target.value);
                setSubId("");
                setStreamId("");
                setCrewId("");
              }}
            >
              <option value="">Select</option>
              {divisions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Sub-Division
            <select
              className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2"
              value={subId}
              disabled={!divisionId}
              onChange={(e) => {
                setSubId(e.target.value);
                setStreamId("");
                setCrewId("");
              }}
            >
              <option value="">Select</option>
              {subs.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Stream
            <select
              className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2"
              value={streamId}
              disabled={!subId}
              onChange={(e) => {
                setStreamId(e.target.value);
                setCrewId("");
              }}
            >
              <option value="">Select</option>
              {streams.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Crew
            <select
              className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2"
              value={crewId}
              disabled={!streamId}
              onChange={(e) => setCrewId(e.target.value)}
            >
              <option value="">Select</option>
              {crews.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="block text-sm">
          Amount (CHF)
          <input
            type="number"
            min={0}
            className="mt-1 w-full max-w-xs rounded-lg border border-[var(--line)] px-3 py-2"
            value={amount}
            disabled={!canWrite}
            onChange={(e) => setAmount(e.target.value)}
          />
        </label>
        {canWrite ? (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-primary"
              disabled={busy || !crewId || amount === ""}
              onClick={() => save(false)}
            >
              Save new
            </button>
            <button
              type="button"
              className="btn-ghost"
              disabled={busy || !crewId || amount === ""}
              onClick={() => save(true)}
            >
              Update existing
            </button>
          </div>
        ) : (
          <p className="text-sm text-[var(--muted)]">Read only for this role.</p>
        )}
        {message ? <p className="text-sm text-[var(--navy)]">{message}</p> : null}
      </section>

      <section className="card overflow-x-auto p-5">
        <h2 className="font-medium text-[var(--navy)]">Budgets · {year}</h2>
        <table className="mt-3 w-full min-w-[480px] text-left text-sm">
          <thead className="text-xs uppercase text-[var(--muted)]">
            <tr>
              <th className="py-2">Crew</th>
              <th className="py-2">Year</th>
              <th className="py-2">Amount</th>
            </tr>
          </thead>
          <tbody>
            {yearBudgets.map((b) => (
              <tr key={b.id} className="border-t border-[var(--line)]">
                <td className="py-2 font-medium">{b.crew.name}</td>
                <td className="py-2">{b.year}</td>
                <td className="py-2">{formatMoney(b.amount, "CHF")}</td>
              </tr>
            ))}
            {yearBudgets.length === 0 ? (
              <tr>
                <td colSpan={3} className="py-4 text-[var(--muted)]">
                  No crew budgets for {year}.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
        <p className="mt-3 text-sm font-semibold text-[var(--navy)]">
          Total {year}:{" "}
          {formatMoney(
            yearBudgets.reduce((s, b) => s + b.amount, 0),
            "CHF",
          )}
        </p>
      </section>
    </div>
  );
}
