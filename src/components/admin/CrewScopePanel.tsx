"use client";

import { useMemo } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

type Unit = { id: string; type: string; name: string; parentId: string | null };

const LEVELS: [string, string][] = [
  ["COMPANY", "Company"],
  ["DIVISION", "Division"],
  ["SUB_DIVISION", "Sub-Division"],
  ["STREAM", "Stream"],
  ["CREW", "Crew"],
];

export function CrewScopePanel({
  units,
  lockedUnitIds,
  activeCrewId,
}: {
  units: Unit[];
  lockedUnitIds: string[];
  activeCrewId: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const byId = useMemo(() => new Map(units.map((u) => [u.id, u])), [units]);
  const locked = useMemo(() => new Set(lockedUnitIds), [lockedUnitIds]);

  // Ancestry of the active crew: type → selected unit id.
  const selected = useMemo(() => {
    const out: Record<string, string> = {};
    let cur = activeCrewId ? byId.get(activeCrewId) : undefined;
    while (cur) {
      out[cur.type] = cur.id;
      cur = cur.parentId ? byId.get(cur.parentId) : undefined;
    }
    return out;
  }, [activeCrewId, byId]);

  const fullyLocked = LEVELS.every(([t]) => !selected[t] || locked.has(selected[t]));

  function optionsFor(type: string, parentType: string | null): Unit[] {
    const parentId = parentType ? selected[parentType] : null;
    return units
      .filter((u) => u.type === type && (parentType ? u.parentId === parentId : u.parentId == null))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  function navigateToCrew(crewId: string) {
    const next = new URLSearchParams(params.toString());
    next.set("crew", crewId);
    router.push(`${pathname}?${next.toString()}`);
  }

  // Choosing an upper level → cascade down to the first crew in that subtree, then navigate.
  function chooseLevel(levelIndex: number, id: string) {
    if (LEVELS[levelIndex][0] === "CREW") {
      navigateToCrew(id);
      return;
    }
    let parentId = id;
    for (let i = levelIndex + 1; i < LEVELS.length; i++) {
      const child = units
        .filter((u) => u.type === LEVELS[i][0] && u.parentId === parentId)
        .sort((a, b) => a.name.localeCompare(b.name))[0];
      if (!child) return;
      if (LEVELS[i][0] === "CREW") {
        navigateToCrew(child.id);
        return;
      }
      parentId = child.id;
    }
  }

  return (
    <aside style={{ flex: "0 0 210px" }} className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-[var(--navy)]">Scope</span>
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] ${
            fullyLocked ? "bg-[var(--panel-2)] text-[var(--muted)]" : "bg-[var(--panel-2)] text-[var(--navy)]"
          }`}
        >
          {fullyLocked ? "Locked to role" : "Selectable"}
        </span>
      </div>

      <div className="flex flex-col gap-2.5">
        {LEVELS.map(([type, label], i) => {
          const value = selected[type] ?? "";
          const opts = optionsFor(type, i === 0 ? null : LEVELS[i - 1][0]);
          const isLocked = value !== "" && locked.has(value);
          const noChoice = opts.length <= 1;
          const readOnly = isLocked || (noChoice && value !== "");
          return (
            <div key={type}>
              <div className="mb-1 text-[11px] text-[var(--muted)]">{label}</div>
              {readOnly ? (
                <div className="flex h-8 items-center justify-between gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-2.5">
                  <span className="text-[13px] text-[var(--navy)]">{byId.get(value)?.name ?? "—"}</span>
                  {isLocked ? (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--muted)]" aria-hidden="true">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  ) : null}
                </div>
              ) : (
                <select
                  className="h-8 w-full rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-2 text-[13px] text-[var(--navy)]"
                  value={value}
                  onChange={(e) => chooseLevel(i, e.target.value)}
                >
                  {value === "" ? <option value="">Select</option> : null}
                  {opts.map((o) => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </select>
              )}
            </div>
          );
        })}
      </div>

      <p className="mt-3 text-[11.5px] leading-relaxed text-[var(--muted)]">
        {fullyLocked
          ? "Auto-selected from your active role and read-only. You configure only crews in your scope."
          : "Levels within your scope are selectable. Pick a crew to configure it."}
      </p>
    </aside>
  );
}
