"use client";

import { useMemo } from "react";

type Unit = { id: string; type: string; name: string; parentId: string | null };

const LEVELS: [string, string][] = [
  ["COMPANY", "Company"],
  ["DIVISION", "Division"],
  ["SUB_DIVISION", "Sub-Division"],
  ["STREAM", "Stream"],
  ["CREW", "Crew"],
];

const SEL =
  "mt-1 w-full truncate rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-3 py-2 text-sm text-[var(--navy)]";

// Estimate intake: a strict Company→Crew waterfall that selects the CREW (the Pod is chosen on
// Plan & cost, filtered by this crew). Defaults to "All" everywhere — the user drills down
// consciously. The chosen Crew drives which config (Days/Point, mappings, rates) the engine applies.
export function OrgPodPicker({
  orgUnits,
  value,
  onChange,
  locked = false,
}: {
  orgUnits: Unit[];
  value: string; // crewId
  onChange: (crewId: string) => void;
  locked?: boolean;
}) {
  const byId = useMemo(() => new Map(orgUnits.map((u) => [u.id, u])), [orgUnits]);

  // Selected path from the current crew's ancestry; empty everywhere when no crew is chosen.
  const selected = useMemo(() => {
    const out: Record<string, string> = { COMPANY: "", DIVISION: "", SUB_DIVISION: "", STREAM: "", CREW: "" };
    let cur = value ? byId.get(value) : undefined;
    while (cur) {
      out[cur.type] = cur.id;
      cur = cur.parentId ? byId.get(cur.parentId) : undefined;
    }
    return out;
  }, [value, byId]);

  function optionsFor(type: string, parentType: string | null): Unit[] {
    const parentVal = parentType ? selected[parentType] : null;
    let base: Unit[];
    if (!parentType) base = orgUnits.filter((u) => u.type === type && u.parentId == null);
    else if (!parentVal) base = [];
    else base = orgUnits.filter((u) => u.type === type && u.parentId === parentVal);
    return base.slice().sort((a, b) => a.name.localeCompare(b.name));
  }

  // Choosing a level resets lower levels; the crew is emitted only when the Crew level is set (else "").
  function choose(levelIndex: number, id: string) {
    const next: Record<string, string> = { ...selected, [LEVELS[levelIndex][0]]: id };
    for (let i = levelIndex + 1; i < LEVELS.length; i++) next[LEVELS[i][0]] = "";
    onChange(next.CREW || "");
  }

  if (locked) {
    const path = LEVELS.map(([t]) => (selected[t] ? byId.get(selected[t])?.name : null)).filter(Boolean).join(" › ");
    return (
      <div className="rounded-lg border border-[var(--line)] bg-[var(--panel-2)] p-3">
        <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Organisation</p>
        <p className="mt-1 break-words text-sm text-[var(--navy)]" title={path}>{path || "—"}</p>
        <p className="mt-1 text-xs text-[var(--muted)]">Locked to your role. The Crew sets the config that applies.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[var(--line)] bg-[var(--panel-2)] p-3">
      <p className="mb-2 text-xs uppercase tracking-wide text-[var(--muted)]">Organisation</p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {LEVELS.map(([type, label], i) => {
          const needsParent = i > 0 && !selected[LEVELS[i - 1][0]];
          const opts = optionsFor(type, i === 0 ? null : LEVELS[i - 1][0]);
          const val = selected[type] ?? "";
          return (
            <label key={type} className={`block text-xs ${needsParent ? "opacity-50" : ""}`}>
              {label}
              <select className={SEL} value={val} disabled={needsParent} onChange={(e) => choose(i, e.target.value)}>
                <option value="">All</option>
                {opts.map((o) => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
            </label>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-[var(--muted)]">Pick down to a Crew; choose the Pod/Team on Plan &amp; cost.</p>
    </div>
  );
}
