"use client";

import { useRouter } from "next/navigation";
import {
  formatRelease,
  formatReleaseYearOnly,
  parseRelease,
  quartersForYear,
  yearsFromCatalogue,
} from "@/lib/releasePeriod";

type Option = { value: string; label: string };
type OrgUnitOption = { id: string; name: string; type: string; parentId: string | null };

export function HomeFilters({
  teams,
  quarters,
  orgUnits,
  team,
  workItemType,
  release,
  crew,
}: {
  teams: Option[];
  quarters: string[];
  orgUnits: OrgUnitOption[];
  team: string;
  workItemType: string;
  release: string;
  crew: string;
}) {
  const router = useRouter();
  const years = yearsFromCatalogue(quarters);
  const parsed = parseRelease(release);
  const yearQuarters = quartersForYear(quarters, parsed.year);
  const crews = orgUnits.filter((u) => u.type === "CREW");

  function apply(next: {
    team?: string;
    workItemType?: string;
    release?: string;
    crew?: string;
  }) {
    const params = new URLSearchParams();
    const t = next.team ?? team;
    const w = next.workItemType ?? workItemType;
    const r = next.release ?? release;
    const c = next.crew ?? crew;
    if (t) params.set("team", t);
    if (w) params.set("workItemType", w);
    if (r) params.set("release", r);
    if (c) params.set("crew", c);
    const qs = params.toString();
    router.push(qs ? `/home?${qs}` : "/home");
  }

  const selectClass =
    "mt-1 w-full rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-3 py-2 text-sm text-[var(--navy)]";

  return (
    <section className="card grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-5">
      <label className="text-sm">
        Crew
        <select
          className={selectClass}
          value={crew}
          onChange={(e) => apply({ crew: e.target.value, team: "" })}
        >
          <option value="">All crews</option>
          {crews.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm">
        Pod / Team
        <select className={selectClass} value={team} onChange={(e) => apply({ team: e.target.value })}>
          <option value="">All teams</option>
          {teams.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm">
        Work type
        <select
          className={selectClass}
          value={workItemType}
          onChange={(e) => apply({ workItemType: e.target.value })}
        >
          <option value="">All work types</option>
          <option value="ISSUE">Issue / Story</option>
          <option value="EPIC">Epic</option>
        </select>
      </label>
      <label className="text-sm">
        Release year
        <select
          className={selectClass}
          value={parsed.year}
          onChange={(e) => {
            const year = e.target.value;
            if (!year) {
              apply({ release: "" });
              return;
            }
            const qs = quartersForYear(quarters, year);
            const keep = parsed.quarter && qs.includes(parsed.quarter) ? parsed.quarter : "";
            apply({
              release: keep ? formatRelease(year, keep) : formatReleaseYearOnly(year),
            });
          }}
        >
          <option value="">All years</option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </label>
      <label className={`text-sm ${parsed.year ? "" : "opacity-60"}`}>
        Release quarter
        <select
          className={selectClass}
          value={parsed.quarter}
          disabled={!parsed.year}
          onChange={(e) => {
            const quarter = e.target.value;
            if (!parsed.year) return;
            if (!quarter) {
              apply({ release: formatReleaseYearOnly(parsed.year) });
              return;
            }
            apply({ release: formatRelease(parsed.year, quarter) });
          }}
        >
          <option value="">{parsed.year ? "All quarters" : "Select year first"}</option>
          {yearQuarters.map((q) => (
            <option key={q} value={q}>
              {q}
            </option>
          ))}
        </select>
      </label>
    </section>
  );
}
