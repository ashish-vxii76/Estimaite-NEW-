"use client";

import { useRouter } from "next/navigation";
import { ORG_TYPES, ORG_TYPE_LABEL, type OrgType } from "@/lib/orgTypes";
import {
  formatRelease,
  formatReleaseYearOnly,
  parseRelease,
  quartersForYear,
  yearsFromCatalogue,
} from "@/lib/releasePeriod";
import type { OrgFilterUnit, OrgFilterTeam } from "@/lib/orgFilter";

export type ExtraFilter = {
  label: string;
  param: string;
  value: string;
  options: { value: string; label: string }[];
  /** Mandatory filter: shown as a non-removable chip, changed only via the drawer. */
  required?: boolean;
  /** Value the chip's ✕ navigates to (default ""). Also the value at which no chip is shown —
   *  e.g. budget year uses "all" so removing the year means "all years", not "back to default". */
  clearValue?: string;
};

const OPEN =
  "mt-1 w-full rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-3 py-2 text-sm text-[var(--navy)]";
const LOCKED =
  "mt-1 w-full cursor-not-allowed rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--navy)] opacity-75";

const PARENT_TYPE: Record<OrgType, OrgType | null> = {
  COMPANY: null,
  DIVISION: "COMPANY",
  SUB_DIVISION: "DIVISION",
  STREAM: "SUB_DIVISION",
  CREW: "STREAM",
};

const ALL_LABEL: Record<OrgType, string> = {
  COMPANY: "All companies",
  DIVISION: "All divisions",
  SUB_DIVISION: "All sub-divisions",
  STREAM: "All streams",
  CREW: "All crews",
};

export function OrgScopeFilters({
  basePath,
  units,
  teams,
  lockedUnitIds,
  org,
  team,
  lockedTeamId = null,
  workItemType = "",
  release = "",
  quarters = [],
  showWorkRelease = true,
  extraFilters = [],
  extraParams = {},
}: {
  basePath: string;
  units: OrgFilterUnit[];
  teams: OrgFilterTeam[];
  lockedUnitIds: string[];
  org: string;
  team: string;
  lockedTeamId?: string | null;
  workItemType?: string;
  release?: string;
  quarters?: string[];
  showWorkRelease?: boolean;
  extraFilters?: ExtraFilter[];
  extraParams?: Record<string, string>;
}) {
  const router = useRouter();
  const byId = new Map(units.map((u) => [u.id, u]));
  const lockedSet = new Set(lockedUnitIds);

  // Selected unit per level: the locked chain always applies; the URL selection
  // (deeper levels) overlays on top.
  const selectedByType: Partial<Record<string, string>> = {};
  for (const id of lockedUnitIds) {
    const u = byId.get(id);
    if (u) selectedByType[u.type] = id;
  }
  let cur = org ? byId.get(org) : undefined;
  while (cur) {
    selectedByType[cur.type] = cur.id;
    cur = cur.parentId ? byId.get(cur.parentId) : undefined;
  }

  function navigate(next: Record<string, string>) {
    const extraVals = Object.fromEntries(extraFilters.map((f) => [f.param, f.value]));
    const merged: Record<string, string> = { org, team, workItemType, release, ...extraVals, ...next };
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(extraParams)) if (v) params.set(k, v);
    for (const [k, v] of Object.entries(merged)) if (v) params.set(k, v as string);
    const qs = params.toString();
    router.push(qs ? `${basePath}?${qs}` : basePath);
  }

  function onOrgLevel(levelType: OrgType, value: string) {
    if (value) {
      navigate({ org: value, team: "" });
    } else {
      // "All" at this level → fall back to the parent's selected node.
      const parentType = PARENT_TYPE[levelType];
      const parentId = parentType ? selectedByType[parentType] ?? "" : "";
      navigate({ org: parentId, team: "" });
    }
  }

  const parsed = parseRelease(release);
  const years = yearsFromCatalogue(quarters);
  const yearQuarters = quartersForYear(quarters, parsed.year);
  const crewSel = selectedByType.CREW;
  const podOptions = teams.filter((t) => (crewSel ? t.crewId === crewSel : true));

  return (
    <section className="card space-y-3 p-5">
      {lockedUnitIds.length > 0 ? (
        <p className="text-xs text-[var(--muted)]">
          Levels at and above your seat are locked to your org path. You can filter within your scope.
        </p>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {ORG_TYPES.map((levelType) => {
          const parentType = PARENT_TYPE[levelType];
          const parentSel = parentType ? selectedByType[parentType] : undefined;
          const options = units.filter(
            (u) => u.type === levelType && (parentSel ? u.parentId === parentSel : true),
          );
          const value = selectedByType[levelType] ?? "";
          const locked = value !== "" && lockedSet.has(value);
          return (
            <label key={levelType} className="text-sm">
              {ORG_TYPE_LABEL[levelType]}
              {locked ? (
                <select className={LOCKED} value={value} disabled aria-readonly="true">
                  <option value={value}>{byId.get(value)?.name ?? "—"}</option>
                </select>
              ) : (
                <select
                  className={OPEN}
                  value={value}
                  onChange={(e) => onOrgLevel(levelType, e.target.value)}
                >
                  <option value="">{ALL_LABEL[levelType]}</option>
                  {options.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              )}
            </label>
          );
        })}

        <label className="text-sm">
          Pod / Team
          {lockedTeamId ? (
            <select className={LOCKED} value={lockedTeamId} disabled aria-readonly="true">
              <option value={lockedTeamId}>{teams.find((t) => t.id === lockedTeamId)?.name ?? "—"}</option>
            </select>
          ) : (
            <select className={OPEN} value={team} onChange={(e) => navigate({ team: e.target.value })}>
              <option value="">All pods</option>
              {podOptions.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          )}
        </label>

        {showWorkRelease && (
        <label className="text-sm">
          Work type
          <select
            className={OPEN}
            value={workItemType}
            onChange={(e) => navigate({ workItemType: e.target.value })}
          >
            <option value="">All work types</option>
            <option value="ISSUE">Issue / Story</option>
            <option value="EPIC">Epic</option>
          </select>
        </label>
        )}

        {showWorkRelease && (
        <>
        <label className="text-sm">
          Release year
          <select
            className={OPEN}
            value={parsed.year}
            onChange={(e) => {
              const year = e.target.value;
              if (!year) {
                navigate({ release: "" });
                return;
              }
              const qs = quartersForYear(quarters, year);
              const keep = parsed.quarter && qs.includes(parsed.quarter) ? parsed.quarter : "";
              navigate({ release: keep ? formatRelease(year, keep) : formatReleaseYearOnly(year) });
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
            className={OPEN}
            value={parsed.quarter}
            disabled={!parsed.year}
            onChange={(e) => {
              const quarter = e.target.value;
              if (!parsed.year) return;
              navigate({
                release: quarter ? formatRelease(parsed.year, quarter) : formatReleaseYearOnly(parsed.year),
              });
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
        </>
        )}

        {extraFilters.map((f) => (
          <label key={f.param} className="text-sm">
            {f.label}
            <select
              className={OPEN}
              value={f.value}
              onChange={(e) => navigate({ [f.param]: e.target.value })}
            >
              {f.options.map((o) => (
                <option key={o.value || "all"} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
    </section>
  );
}
