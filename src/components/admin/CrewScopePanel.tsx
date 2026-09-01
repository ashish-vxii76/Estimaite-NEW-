"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

type Unit = { id: string; type: string; name: string; parentId: string | null };

const LEVELS: [string, string][] = [
  ["COMPANY", "Company"],
  ["DIVISION", "Division"],
  ["SUB_DIVISION", "Sub-Division"],
  ["STREAM", "Stream"],
  ["CREW", "Crew"],
];
const ALL = "ALL";

// DEC-011: Company→Crew waterfall. "All" at every level = the true Global config; drilling to a
// specific Crew = that crew's config. Levels the user's role locks are read-only chips.
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

  // Cascade selection is LOCAL state so an in-progress pick (e.g. Company) persists while the user
  // drills down — we only navigate when the resolved Crew changes. Seed from the active crew's
  // ancestry; with no active crew every level is "All".
  const deriveFromCrew = useCallback(
    (crewId: string | null): Record<string, string> => {
      const out: Record<string, string> = {
        COMPANY: ALL, DIVISION: ALL, SUB_DIVISION: ALL, STREAM: ALL, CREW: ALL,
      };
      let cur = crewId ? byId.get(crewId) : undefined;
      while (cur) {
        out[cur.type] = cur.id;
        cur = cur.parentId ? byId.get(cur.parentId) : undefined;
      }
      return out;
    },
    [byId],
  );

  const [selected, setSelected] = useState<Record<string, string>>(() => deriveFromCrew(activeCrewId));

  // Re-sync when the server's active crew changes (after a navigation) — but not on plain in-panel
  // picks, which don't change activeCrewId, so those stay put.
  useEffect(() => {
    setSelected(deriveFromCrew(activeCrewId));
  }, [activeCrewId, deriveFromCrew]);

  const fullyLocked =
    lockedUnitIds.length > 0 && LEVELS.every(([t]) => selected[t] === ALL || locked.has(selected[t]));

  // Strict cascade: options are ONLY the children of the selected parent. A level with an unset
  // ("All") parent has no options and isn't shown (see the render guard) — no skipping ahead.
  function optionsFor(type: string, parentType: string | null): Unit[] {
    const parentVal = parentType ? selected[parentType] : null;
    let base: Unit[];
    if (!parentType) base = units.filter((u) => u.type === type && u.parentId == null);
    else if (parentVal === ALL) base = [];
    else base = units.filter((u) => u.type === type && u.parentId === parentVal);
    return base.slice().sort((a, b) => a.name.localeCompare(b.name));
  }

  function navigateCrew(crewIdOrEmpty: string) {
    const next = new URLSearchParams(params.toString());
    if (crewIdOrEmpty) next.set("crew", crewIdOrEmpty);
    else next.delete("crew");
    router.push(`${pathname}?${next.toString()}`);
  }

  // Choosing a level sets it and resets every lower level to "All". Intermediate picks (Company…
  // Stream) update local state only; we navigate solely when the resolved Crew actually changes.
  function chooseLevel(levelIndex: number, value: string) {
    const next: Record<string, string> = { ...selected, [LEVELS[levelIndex][0]]: value };
    for (let i = levelIndex + 1; i < LEVELS.length; i++) next[LEVELS[i][0]] = ALL;
    setSelected(next);
    const resolvedCrew = next.CREW === ALL ? null : next.CREW;
    if (resolvedCrew !== (activeCrewId ?? null)) navigateCrew(resolvedCrew ?? "");
  }

  return (
    <aside style={{ flex: "0 0 288px" }} className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-[var(--navy)]">Scope</span>
        <span className="rounded-full bg-[var(--panel-2)] px-2 py-0.5 text-[11px] text-[var(--muted)]">
          {fullyLocked ? "Locked to role" : "Selectable"}
        </span>
      </div>

      <div className="flex flex-col gap-2.5">
        {LEVELS.map(([type, label], i) => {
          const value = selected[type] ?? ALL;
          const isLocked = value !== ALL && locked.has(value);
          // Strict drill-down: a level is greyed out (disabled) until its parent has a concrete
          // (non-"All") value — visible the whole time, never skippable.
          const disabled = i > 0 && selected[LEVELS[i - 1][0]] === ALL;
          const opts = optionsFor(type, i === 0 ? null : LEVELS[i - 1][0]);
          const displayName = value === ALL ? "All" : byId.get(value)?.name ?? "—";
          return (
            <div key={type} className={`min-w-0 ${disabled ? "opacity-45" : ""}`}>
              <div className="mb-1 text-[11px] text-[var(--muted)]">{label}</div>
              {isLocked ? (
                <div className="flex h-8 items-center justify-between gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-2.5" title={displayName}>
                  <span className="truncate text-[13px] text-[var(--navy)]">{displayName}</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-[var(--muted)]" aria-hidden="true">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
              ) : (
                <select
                  className={`h-8 w-full truncate rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-2 text-[13px] text-[var(--navy)] ${disabled ? "cursor-not-allowed" : ""}`}
                  value={value}
                  title={disabled ? "Select the level above first" : displayName}
                  disabled={disabled}
                  onChange={(e) => chooseLevel(i, e.target.value)}
                >
                  <option value={ALL}>All</option>
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
          ? "Auto-selected from your active role and read-only. You configure only your crew."
          : "Leave Company on “All” for the global config. Pick a level to reveal the next one, down to a crew, to configure that crew."}
      </p>
    </aside>
  );
}
