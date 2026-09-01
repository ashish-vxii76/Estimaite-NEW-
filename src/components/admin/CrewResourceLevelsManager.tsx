"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Level = { id: string; name: string; capacitySpPerSprint: number; daysPerPoint: number };
type Crew = { id: string; name: string };

export function CrewResourceLevelsManager({
  crews,
  resourceLevels,
  overrides,
  canWrite,
}: {
  crews: Crew[];
  resourceLevels: Level[];
  overrides: Record<string, Record<string, number>>;
  canWrite: boolean;
}) {
  const router = useRouter();
  const [crewId, setCrewId] = useState(crews[0]?.id ?? "");
  // local edit buffer: levelId -> string ("" means inherit global)
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [store, setStore] = useState(overrides);

  const crewOverride = useMemo(() => store[crewId] ?? {}, [store, crewId]);

  function currentValue(levelId: string): string {
    if (levelId in draft) return draft[levelId];
    const ov = crewOverride[levelId];
    return ov != null ? String(ov) : "";
  }

  function setValue(levelId: string, v: string) {
    setDraft((d) => ({ ...d, [levelId]: v }));
  }

  function selectCrew(id: string) {
    setCrewId(id);
    setDraft({});
    setMessage("");
  }

  function copyFromGlobal() {
    // Seed every input with the global Days/Point so the admin can tune from the standard baseline.
    const next: Record<string, string> = {};
    for (const l of resourceLevels) next[l.id] = String(l.daysPerPoint);
    setDraft(next);
    setMessage("Prefilled from global — review, then Save to apply to this crew.");
  }

  function clearAll() {
    const next: Record<string, string> = {};
    for (const l of resourceLevels) next[l.id] = "";
    setDraft(next);
    setMessage("Cleared — Save to make this crew fully inherit global.");
  }

  const dirty = Object.keys(draft).length > 0;

  async function save() {
    setBusy(true);
    setMessage("");
    try {
      // Merge draft over the known override; "" clears.
      const payload: Record<string, number | null> = {};
      for (const l of resourceLevels) {
        const v = currentValue(l.id);
        payload[l.id] = v === "" ? null : Number(v);
      }
      const res = await fetch("/api/admin/crew-resource-levels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ crewId, overrides: payload }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      setStore((s) => ({ ...s, [crewId]: data.overrides ?? {} }));
      setDraft({});
      const n = Object.keys(data.overrides ?? {}).length;
      setMessage(n === 0 ? "Saved — this crew now fully inherits global." : `Saved ${n} per-crew override(s).`);
      router.refresh();
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const crewName = crews.find((c) => c.id === crewId)?.name ?? "";

  return (
    <div className="space-y-6">
      <header>
        <p className="kicker">Configuration</p>
        <h1 className="font-display text-2xl font-semibold text-[var(--navy)]">Crew resource levels</h1>
        <p className="mt-1 max-w-3xl text-sm text-[var(--muted)]">
          Per-crew <strong>Days / Point</strong> for each resource level. A crew&apos;s estimates use its own
          value where set, otherwise the global default. Leave a field blank to inherit global. Capacity
          and the resource-level definitions are governed globally and shown for reference.
        </p>
      </header>

      <section className="card space-y-4 p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <label className="text-sm text-[var(--muted)]">
            Crew
            <select
              className="mt-1 block rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-3 py-2 text-sm text-[var(--navy)]"
              value={crewId}
              onChange={(e) => selectCrew(e.target.value)}
            >
              {crews.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>
          {canWrite ? (
            <div className="flex items-center gap-2">
              <button type="button" className="rounded-lg border border-[var(--line)] px-3 py-2 text-sm text-[var(--navy)]" onClick={copyFromGlobal}>
                Copy from global config
              </button>
              <button type="button" className="rounded-lg border border-[var(--line)] px-3 py-2 text-sm text-[var(--muted)]" onClick={clearAll}>
                Inherit all
              </button>
            </div>
          ) : null}
        </div>

        {crews.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No crews in your scope.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="text-xs uppercase text-[var(--muted)]">
                <tr>
                  <th className="py-2">Resource level</th>
                  <th className="py-2">Capacity / sprint <span className="normal-case">(governed)</span></th>
                  <th className="py-2">Global Days / Point</th>
                  <th className="py-2">{crewName} Days / Point</th>
                  <th className="py-2">Effective</th>
                </tr>
              </thead>
              <tbody>
                {resourceLevels.map((l) => {
                  const v = currentValue(l.id);
                  const effective = v === "" ? l.daysPerPoint : Number(v);
                  const overridden = v !== "" && Number(v) !== l.daysPerPoint;
                  return (
                    <tr key={l.id} className="border-t border-[var(--line)]">
                      <td className="py-2 font-medium">{l.name}</td>
                      <td className="py-2 text-[var(--muted)]">{l.capacitySpPerSprint}</td>
                      <td className="py-2 text-[var(--muted)]">{l.daysPerPoint}</td>
                      <td className="py-2">
                        {canWrite ? (
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            placeholder="(inherit)"
                            className="w-28 rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-2 py-1"
                            value={v}
                            onChange={(e) => setValue(l.id, e.target.value)}
                          />
                        ) : v === "" ? (
                          <span className="text-[var(--muted)]">inherit</span>
                        ) : (
                          v
                        )}
                      </td>
                      <td className="py-2 font-semibold text-[var(--navy)]">
                        {effective}
                        {overridden ? <span className="ml-2 rounded bg-[var(--panel-2)] px-1.5 py-0.5 text-xs text-[var(--muted)]">override</span> : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {canWrite && crews.length > 0 ? (
          <div className="flex items-center gap-3">
            <button type="button" className="btn-primary" disabled={busy || !dirty} onClick={save}>
              Save for {crewName}
            </button>
            {dirty ? <span className="text-sm text-[var(--muted)]">Unsaved changes</span> : null}
          </div>
        ) : null}
        {message ? <p className="text-sm text-[var(--navy)]">{message}</p> : null}
        {!canWrite ? <p className="text-sm text-[var(--muted)]">Read only for this role.</p> : null}
      </section>
    </div>
  );
}
