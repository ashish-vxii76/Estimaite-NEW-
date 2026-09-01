"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Unit = { id: string; type: string; name: string; parentId: string | null };
type Team = { id: string; name: string; crewId?: string | null };

const LEVELS: [string, string][] = [
  ["COMPANY", "Company"],
  ["DIVISION", "Division"],
  ["SUB_DIVISION", "Sub-Division"],
  ["STREAM", "Stream"],
  ["CREW", "Crew"],
];

const SEL =
  "mt-1 w-full truncate rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-3 py-2 text-sm text-[var(--navy)]";

// DEC-011/#2: replaces the read-only "Organisation (from Pod)" breadcrumb with a strict
// Company→Crew→Pod waterfall that SETS the estimate's Pod. The chosen Pod drives the crew config
// (Days/Point, capacity, mappings) via the estimate engine. RBAC-locked users see it read-only.
export function OrgPodPicker({
  orgUnits,
  teams,
  value,
  onChange,
  locked = false,
}: {
  orgUnits: Unit[];
  teams: Team[];
  value: string; // teamId (Pod)
  onChange: (teamId: string) => void;
  locked?: boolean;
}) {
  const byId = useMemo(() => new Map(orgUnits.map((u) => [u.id, u])), [orgUnits]);
  const teamById = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);

  const deriveFromTeam = useCallback(
    (teamId: string): Record<string, string> => {
      const out: Record<string, string> = { COMPANY: "", DIVISION: "", SUB_DIVISION: "", STREAM: "", CREW: "" };
      const crewId = teamById.get(teamId)?.crewId ?? null;
      let cur = crewId ? byId.get(crewId) : undefined;
      while (cur) {
        out[cur.type] = cur.id;
        cur = cur.parentId ? byId.get(cur.parentId) : undefined;
      }
      return out;
    },
    [byId, teamById],
  );

  const [sel, setSel] = useState<Record<string, string>>(() => deriveFromTeam(value));
  useEffect(() => {
    setSel(deriveFromTeam(value));
  }, [value, deriveFromTeam]);

  function optionsFor(type: string, parentType: string | null): Unit[] {
    const parentVal = parentType ? sel[parentType] : null;
    let base: Unit[];
    if (!parentType) base = orgUnits.filter((u) => u.type === type && u.parentId == null);
    else if (!parentVal) base = [];
    else base = orgUnits.filter((u) => u.type === type && u.parentId === parentVal);
    return base.slice().sort((a, b) => a.name.localeCompare(b.name));
  }

  const crewSel = sel.CREW;
  const podOptions = teams.filter((t) => (crewSel ? t.crewId === crewSel : false));
  const podValue = value && teamById.get(value)?.crewId === crewSel ? value : "";

  function chooseOrg(levelIndex: number, id: string) {
    const next: Record<string, string> = { ...sel, [LEVELS[levelIndex][0]]: id };
    for (let i = levelIndex + 1; i < LEVELS.length; i++) next[LEVELS[i][0]] = "";
    setSel(next);
    // Changing an org level clears the Pod until one under the new path is chosen.
  }

  if (locked) {
    // Read-only: show the resolved path + pod as a single breadcrumb.
    const path = LEVELS.map(([t]) => (sel[t] ? byId.get(sel[t])?.name : null))
      .filter(Boolean)
      .concat(teamById.get(value)?.name ? [teamById.get(value)!.name] : [])
      .join(" › ");
    return (
      <div className="rounded-lg border border-[var(--line)] bg-[var(--panel-2)] p-3">
        <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Organisation &amp; Pod</p>
        <p className="mt-1 truncate text-sm text-[var(--navy)]" title={path}>{path || "—"}</p>
        <p className="mt-1 text-xs text-[var(--muted)]">Locked to your role. The Pod sets the crew whose config applies.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[var(--line)] bg-[var(--panel-2)] p-3">
      <p className="mb-2 text-xs uppercase tracking-wide text-[var(--muted)]">Organisation &amp; Pod</p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {LEVELS.map(([type, label], i) => {
          const needsParent = i > 0 && !sel[LEVELS[i - 1][0]];
          const opts = optionsFor(type, i === 0 ? null : LEVELS[i - 1][0]);
          const val = sel[type] ?? "";
          return (
            <label key={type} className={`block text-xs ${needsParent ? "opacity-50" : ""}`}>
              {label}
              <select className={SEL} value={val} disabled={needsParent} onChange={(e) => chooseOrg(i, e.target.value)}>
                <option value="">Select {label.toLowerCase()}</option>
                {opts.map((o) => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
            </label>
          );
        })}
        <label className={`block text-xs ${!crewSel ? "opacity-50" : ""}`}>
          Pod
          <select
            className={SEL}
            value={podValue}
            disabled={!crewSel}
            onChange={(e) => e.target.value && onChange(e.target.value)}
          >
            <option value="">Select pod</option>
            {podOptions.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </label>
      </div>
      <p className="mt-2 text-xs text-[var(--muted)]">The selected Pod sets the Crew whose config (Days/Point, mappings) applies.</p>
    </div>
  );
}
