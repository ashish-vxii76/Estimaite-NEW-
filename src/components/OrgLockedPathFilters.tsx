"use client";

import { useRouter } from "next/navigation";
import type { LockedOrgPathView } from "@/lib/lockedOrgPath";

type Option = { id: string; name: string };

const LOCKED =
  "mt-1 w-full cursor-not-allowed rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--navy)] opacity-90";
const OPEN =
  "mt-1 w-full rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-3 py-2 text-sm text-[var(--navy)]";

/**
 * Company → Crew are locked (read-only). Only Pod / Team is selectable.
 */
export function OrgLockedPathFilters({
  basePath,
  path,
  teams,
  team,
  extraParams = {},
}: {
  basePath: string;
  path: LockedOrgPathView;
  teams: Option[];
  team: string;
  extraParams?: Record<string, string>;
}) {
  const router = useRouter();

  function applyTeam(nextTeam: string) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(extraParams)) {
      if (v) params.set(k, v);
    }
    if (nextTeam) params.set("team", nextTeam);
    const qs = params.toString();
    router.push(qs ? `${basePath}?${qs}` : basePath);
  }

  return (
    <section className="card space-y-3 p-5">
      <p className="text-xs text-[var(--muted)]">
        Organisation path is locked to your seat (or this CR). Only Pod / Team is open.
      </p>
      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        <LockedField label="Company" value={path.companyName} />
        <LockedField label="Division" value={path.divisionName} />
        <LockedField label="Sub-Division" value={path.subDivisionName} />
        <LockedField label="Stream" value={path.streamName} />
        <LockedField label="Crew" value={path.crewName} />
        <label className="text-sm">
          Pod / Team
          <select className={OPEN} value={team} onChange={(e) => applyTeam(e.target.value)}>
            <option value="">All pods in path</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
      </div>
    </section>
  );
}

function LockedField({ label, value }: { label: string; value: string }) {
  return (
    <label className="text-sm">
      {label}
      <input className={LOCKED} value={value} readOnly tabIndex={-1} aria-readonly="true" />
    </label>
  );
}
