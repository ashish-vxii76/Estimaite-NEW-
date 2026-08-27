"use client";

import {
  formatRelease,
  formatReleaseYearOnly,
  parseRelease,
  quartersForYear,
  yearsFromCatalogue,
} from "@/lib/releasePeriod";
import { OrgCascadeFilters } from "@/components/OrgCascadeFilters";
import type { LockedOrgPathView } from "@/lib/lockedOrgPath";
import type { OrgUnitRow } from "@/lib/orgCascade";
import { useRouter } from "next/navigation";

type TeamOption = { id: string; name: string; crewId?: string | null };

export function HomeFilters({
  quarters,
  orgUnits,
  teams,
  orgEditable,
  lockedPath,
  company,
  division,
  subDivision,
  stream,
  crew,
  team,
  workItemType,
  release,
}: {
  quarters: string[];
  orgUnits: OrgUnitRow[];
  teams: TeamOption[];
  orgEditable: boolean;
  lockedPath: LockedOrgPathView;
  company: string;
  division: string;
  subDivision: string;
  stream: string;
  crew: string;
  team: string;
  workItemType: string;
  release: string;
}) {
  const router = useRouter();
  const years = yearsFromCatalogue(quarters);
  const parsed = parseRelease(release);
  const yearQuarters = quartersForYear(quarters, parsed.year);

  const orgExtra = {
    ...(company ? { company } : {}),
    ...(division ? { division } : {}),
    ...(subDivision ? { subDivision } : {}),
    ...(stream ? { stream } : {}),
    ...(crew ? { crew } : {}),
    ...(team ? { team } : {}),
  };

  function applyMeta(next: { workItemType?: string; release?: string }) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(orgExtra)) {
      if (v) params.set(k, v);
    }
    const w = next.workItemType ?? workItemType;
    const r = next.release ?? release;
    if (w) params.set("workItemType", w);
    if (r) params.set("release", r);
    const qs = params.toString();
    router.push(qs ? `/home?${qs}` : "/home");
  }

  const selectClass =
    "mt-1 w-full rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-3 py-2 text-sm text-[var(--navy)]";

  return (
    <div className="space-y-4">
      <OrgCascadeFilters
        basePath="/home"
        orgUnits={orgUnits}
        teams={teams}
        orgEditable={orgEditable}
        lockedPath={lockedPath}
        company={company}
        division={division}
        subDivision={subDivision}
        stream={stream}
        crew={crew}
        team={team}
        extraParams={{
          ...(workItemType ? { workItemType } : {}),
          ...(release ? { release } : {}),
        }}
      />

      <section className="card grid gap-4 p-5 md:grid-cols-3">
        <label className="text-sm">
          Work type
          <select
            className={selectClass}
            value={workItemType}
            onChange={(e) => applyMeta({ workItemType: e.target.value })}
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
                applyMeta({ release: "" });
                return;
              }
              const qs = quartersForYear(quarters, year);
              const keep = parsed.quarter && qs.includes(parsed.quarter) ? parsed.quarter : "";
              applyMeta({
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
                applyMeta({ release: formatReleaseYearOnly(parsed.year) });
                return;
              }
              applyMeta({ release: formatRelease(parsed.year, quarter) });
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
    </div>
  );
}
