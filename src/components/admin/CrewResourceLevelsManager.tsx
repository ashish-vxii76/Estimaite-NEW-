"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Level = { id: string; name: string; capacitySpPerSprint: number; daysPerPoint: number };
type Crew = { id: string; name: string };
type OverrideMap = Record<string, Record<string, number>>;

export function CrewResourceLevelsManager({
  crews,
  resourceLevels,
  overrides,
  capacityOverrides,
  canWrite,
}: {
  crews: Crew[];
  resourceLevels: Level[];
  overrides: OverrideMap;
  capacityOverrides: OverrideMap;
  canWrite: boolean;
}) {
  const router = useRouter();
  const [crewId, setCrewId] = useState(crews[0]?.id ?? "");
  // local edit buffers keyed by levelId; "" = inherit global. Absent = unchanged from store.
  const [dppDraft, setDppDraft] = useState<Record<string, string>>({});
  const [capDraft, setCapDraft] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [dppStore, setDppStore] = useState<OverrideMap>(overrides);
  const [capStore, setCapStore] = useState<OverrideMap>(capacityOverrides);

  const crewDpp = useMemo(() => dppStore[crewId] ?? {}, [dppStore, crewId]);
  const crewCap = useMemo(() => capStore[crewId] ?? {}, [capStore, crewId]);

  function valDpp(levelId: string): string {
    if (levelId in dppDraft) return dppDraft[levelId];
    const ov = crewDpp[levelId];
    return ov != null ? String(ov) : "";
  }
  function valCap(levelId: string): string {
    if (levelId in capDraft) return capDraft[levelId];
    const ov = crewCap[levelId];
    return ov != null ? String(ov) : "";
  }

  function selectCrew(id: string) {
    setCrewId(id);
    setDppDraft({});
    setCapDraft({});
    setMessage("");
  }

  function copyFromGlobal() {
    const d: Record<string, string> = {};
    const c: Record<string, string> = {};
    for (const l of resourceLevels) {
      d[l.id] = String(l.daysPerPoint);
      c[l.id] = String(l.capacitySpPerSprint);
    }
    setDppDraft(d);
    setCapDraft(c);
    setMessage("Prefilled from global — review, then Save to apply to this crew.");
  }

  function clearAll() {
    const empty: Record<string, string> = {};
    for (const l of resourceLevels) empty[l.id] = "";
    setDppDraft({ ...empty });
    setCapDraft({ ...empty });
    setMessage("Cleared — Save to make this crew fully inherit global.");
  }

  const dirty = Object.keys(dppDraft).length > 0 || Object.keys(capDraft).length > 0;

  async function save() {
    setBusy(true);
    setMessage("");
    try {
      const dppPayload: Record<string, number | null> = {};
      const capPayload: Record<string, number | null> = {};
      for (const l of resourceLevels) {
        const d = valDpp(l.id);
        const c = valCap(l.id);
        dppPayload[l.id] = d === "" ? null : Number(d);
        capPayload[l.id] = c === "" ? null : Number(c);
      }
      const res = await fetch("/api/admin/crew-resource-levels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ crewId, overrides: dppPayload, capacityOverrides: capPayload }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      setDppStore((s) => ({ ...s, [crewId]: data.overrides ?? {} }));
      setCapStore((s) => ({ ...s, [crewId]: data.capacityOverrides ?? {} }));
      setDppDraft({});
      setCapDraft({});
      const n = Object.keys(data.overrides ?? {}).length + Object.keys(data.capacityOverrides ?? {}).length;
      setMessage(n === 0 ? "Saved — this crew now fully inherits global." : `Saved ${n} per-crew override(s).`);
      router.refresh();
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const crewName = crews.find((c) => c.id === crewId)?.name ?? "";

  function cell(
    levelId: string,
    globalVal: number,
    read: (id: string) => string,
    write: (id: string, v: string) => void,
  ) {
    const v = read(levelId);
    const overridden = v !== "" && Number(v) !== globalVal;
    return (
      <td className="py-2">
        <div className="flex items-center gap-2">
          <span className="w-10 text-xs text-[var(--muted)]">{globalVal}</span>
          {canWrite ? (
            <input
              type="number"
              min={0}
              step="0.01"
              placeholder="inherit"
              className="w-24 rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-2 py-1"
              value={v}
              onChange={(e) => write(levelId, e.target.value)}
            />
          ) : v === "" ? (
            <span className="text-[var(--muted)]">inherit</span>
          ) : (
            <span className="font-medium">{v}</span>
          )}
          {overridden ? (
            <span className="rounded bg-[var(--panel-2)] px-1.5 py-0.5 text-xs text-[var(--muted)]">override</span>
          ) : null}
        </div>
      </td>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="kicker">Configuration</p>
        <h1 className="font-display text-2xl font-semibold text-[var(--navy)]">Crew resource levels</h1>
        <p className="mt-1 max-w-3xl text-sm text-[var(--muted)]">
          Per-crew <strong>Capacity / sprint</strong> and <strong>Days / Point</strong> for each resource
          level. A crew&apos;s estimates use its own value where set, otherwise the global default (shown
          greyed to its left). Leave a field blank to inherit global. Resource-level names and the
          governed mappings/thresholds remain global.
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
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="text-xs uppercase text-[var(--muted)]">
                <tr>
                  <th className="py-2">Resource level</th>
                  <th className="py-2">Capacity / sprint <span className="normal-case text-[var(--muted)]">(global · {crewName})</span></th>
                  <th className="py-2">Days / Point <span className="normal-case text-[var(--muted)]">(global · {crewName})</span></th>
                </tr>
              </thead>
              <tbody>
                {resourceLevels.map((l) => (
                  <tr key={l.id} className="border-t border-[var(--line)]">
                    <td className="py-2 font-medium">{l.name}</td>
                    {cell(l.id, l.capacitySpPerSprint, valCap, (id, v) => setCapDraft((s) => ({ ...s, [id]: v })))}
                    {cell(l.id, l.daysPerPoint, valDpp, (id, v) => setDppDraft((s) => ({ ...s, [id]: v })))}
                  </tr>
                ))}
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

      <section className="card p-5">
        <h2 className="font-medium text-[var(--navy)]">Governed globally (read-only)</h2>
        <p className="mt-1 max-w-3xl text-sm text-[var(--muted)]">
          The rest of the estimation model is the same for every crew and is <strong>not</strong> per-crew
          editable — this keeps estimates governed and comparable across crews. Administrators manage these
          centrally; a crew tunes only its Capacity/sprint and Days/Point above.
        </p>
        <ul className="mt-3 grid gap-2 text-sm text-[var(--navy)] sm:grid-cols-2">
          {GOVERNED_GLOBAL.map((g) => (
            <li key={g} className="rounded-lg border border-[var(--line)] px-3 py-2">{g}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}

/** DEC-009 D7 Class-B: governed domain model — global-only, shown here so crews know what is fixed. */
const GOVERNED_GLOBAL = [
  "Complexity dimensions & weights",
  "Complexity → t-shirt bands & mappings",
  "Story-point / issue / epic size mappings",
  "Governance thresholds (review / split / decompose)",
  "Sprint working days, Dev/QA split, rounding",
  "Commercial costing semantics",
];
