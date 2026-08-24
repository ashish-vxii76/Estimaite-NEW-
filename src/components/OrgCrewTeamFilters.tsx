"use client";

import { useRouter } from "next/navigation";

type Option = { id: string; name: string };

/**
 * Shared Crew + Pod filter strip for Calibration / What-If (and similar analytics).
 * Keeps URL query params in sync so server pages can re-scope data.
 */
export function OrgCrewTeamFilters({
  basePath,
  crews,
  teams,
  crew,
  team,
  extraParams = {},
}: {
  basePath: string;
  crews: Option[];
  teams: Option[];
  crew: string;
  team: string;
  /** Other query params to preserve (e.g. year). */
  extraParams?: Record<string, string>;
}) {
  const router = useRouter();

  function apply(next: { crew?: string; team?: string }) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(extraParams)) {
      if (v) params.set(k, v);
    }
    const c = next.crew ?? crew;
    const t = next.team ?? team;
    if (c) params.set("crew", c);
    if (t) params.set("team", t);
    const qs = params.toString();
    router.push(qs ? `${basePath}?${qs}` : basePath);
  }

  const selectClass =
    "mt-1 w-full rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-3 py-2 text-sm text-[var(--navy)]";

  return (
    <section className="card grid gap-4 p-5 md:grid-cols-2">
      <label className="text-sm">
        Crew
        <select
          className={selectClass}
          value={crew}
          onChange={(e) => apply({ crew: e.target.value, team: "" })}
        >
          <option value="">All crews in scope</option>
          {crews.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm">
        Pod / Team
        <select
          className={selectClass}
          value={team}
          onChange={(e) => apply({ team: e.target.value })}
        >
          <option value="">All pods</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </label>
    </section>
  );
}
