"use client";

import { useState } from "react";
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
import type { ExtraFilter } from "@/components/OrgScopeFilters";

// DEC-UI: SharePoint-style collapsible filters. A slim always-visible chip bar shows the active
// filters (RBAC-locked scope = one read-only breadcrumb chip; user selections = removable chips),
// and a right-side drawer (closed by default) edits them, batching on Apply. Org removal peels
// downward (removing a level clears the levels beneath it — the tree forbids an orphaned child).

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

const SEL =
  "mt-1 w-full rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-3 py-2 text-sm text-[var(--navy)]";
const SEL_LOCKED =
  "mt-1 w-full cursor-not-allowed rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--navy)] opacity-75";

type Props = {
  basePath: string;
  units: OrgFilterUnit[];
  teams: OrgFilterTeam[];
  lockedUnitIds: string[];
  lockedTeamId?: string | null;
  org: string;
  team: string;
  workItemType?: string;
  release?: string;
  quarters?: string[];
  showWorkRelease?: boolean;
  extraFilters?: ExtraFilter[];
  extraParams?: Record<string, string>;
};

/** selectedByType for a given org id: the locked chain always applies, the org selection overlays. */
function selectedFor(orgId: string, units: OrgFilterUnit[], lockedUnitIds: string[]) {
  const byId = new Map(units.map((u) => [u.id, u]));
  const sel: Partial<Record<string, string>> = {};
  for (const id of lockedUnitIds) {
    const u = byId.get(id);
    if (u) sel[u.type] = id;
  }
  let cur = orgId ? byId.get(orgId) : undefined;
  while (cur) {
    sel[cur.type] = cur.id;
    cur = cur.parentId ? byId.get(cur.parentId) : undefined;
  }
  return sel;
}

export function ScopeFilterBar(props: Props) {
  const {
    basePath,
    units,
    teams,
    lockedUnitIds,
    lockedTeamId = null,
    org,
    team,
    workItemType = "",
    release = "",
    quarters = [],
    showWorkRelease = true,
    extraFilters = [],
    extraParams = {},
  } = props;

  const router = useRouter();
  const [open, setOpen] = useState(false);
  const byId = new Map(units.map((u) => [u.id, u]));
  const lockedSet = new Set(lockedUnitIds);
  const parsed = parseRelease(release);

  // ── URL navigation (single source of truth for applied filters) ──
  function navigate(next: Record<string, string>) {
    const extraVals = Object.fromEntries(extraFilters.map((f) => [f.param, f.value]));
    const merged: Record<string, string> = { org, team, workItemType, release, ...extraVals, ...next };
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(extraParams)) if (v) params.set(k, v);
    for (const [k, v] of Object.entries(merged)) if (v) params.set(k, v as string);
    const qs = params.toString();
    router.push(qs ? `${basePath}?${qs}` : basePath);
  }

  // ── Locked breadcrumb (one read-only chip = the RBAC scope) ──
  const lockedNames: string[] = [];
  for (const t of ORG_TYPES) {
    const id = lockedUnitIds.find((x) => byId.get(x)?.type === t);
    if (id) lockedNames.push(byId.get(id)!.name);
  }
  if (lockedTeamId) lockedNames.push(teams.find((t) => t.id === lockedTeamId)?.name ?? "—");
  const lockedPath = lockedNames.join(" › ");

  // ── Applied (chip) state, from props ──
  const appliedSel = selectedFor(org, units, lockedUnitIds);
  const orgChips = ORG_TYPES.map((t) => {
    const id = appliedSel[t];
    if (!id || lockedSet.has(id)) return null; // unset or locked → not an editable chip
    return { type: t, id, name: byId.get(id)?.name ?? "—" };
  }).filter(Boolean) as { type: OrgType; id: string; name: string }[];

  const extraChip = (f: ExtraFilter) =>
    f.value ? f.options.find((o) => o.value === f.value)?.label ?? f.value : null;

  const activeCount =
    orgChips.length +
    (team && !lockedTeamId ? 1 : 0) +
    (showWorkRelease && workItemType ? 1 : 0) +
    (showWorkRelease && parsed.year ? 1 : 0) +
    (showWorkRelease && parsed.quarter ? 1 : 0) +
    extraFilters.filter((f) => f.value).length;

  // Remove an org level → set org to that level's PARENT selection (clears it + everything below).
  function removeOrgLevel(t: OrgType) {
    const parentType = PARENT_TYPE[t];
    const parentId = parentType ? appliedSel[parentType] ?? "" : "";
    navigate({ org: parentId, team: "" });
  }

  return (
    <>
      {/* ── Slim always-visible chip bar ── */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--panel)] px-3 py-2">
        {lockedPath ? (
          <span
            title={lockedPath}
            className="inline-flex max-w-[22rem] items-center gap-1.5 truncate rounded-full border border-[var(--line)] bg-[var(--panel-2)] px-2.5 py-1 text-xs font-medium text-[var(--muted)]"
          >
            <LockIcon /> <span className="truncate">{lockedPath}</span>
          </span>
        ) : null}

        {orgChips.map((c) => (
          <Chip key={c.type} label={`${ORG_TYPE_LABEL[c.type]}: ${c.name}`} onRemove={() => removeOrgLevel(c.type)} />
        ))}
        {team && !lockedTeamId ? (
          <Chip label={`Pod: ${teams.find((t) => t.id === team)?.name ?? "—"}`} onRemove={() => navigate({ team: "" })} />
        ) : null}

        {showWorkRelease && workItemType ? (
          <Chip
            label={`Work: ${workItemType === "EPIC" ? "Epic" : "Issue / Story"}`}
            onRemove={() => navigate({ workItemType: "" })}
          />
        ) : null}
        {showWorkRelease && parsed.year ? (
          <Chip label={`Year: ${parsed.year}`} onRemove={() => navigate({ release: "" })} />
        ) : null}
        {showWorkRelease && parsed.quarter ? (
          <Chip
            label={`Quarter: ${parsed.quarter}`}
            onRemove={() => navigate({ release: formatReleaseYearOnly(parsed.year) })}
          />
        ) : null}

        {extraFilters.map((f) => {
          const lbl = extraChip(f);
          if (!lbl) return null;
          // Mandatory filters (e.g. budget year) show as a non-removable chip — change via the drawer.
          return f.required ? (
            <span
              key={f.param}
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--line)] bg-[var(--panel-2)] px-2.5 py-1 text-xs font-medium text-[var(--muted)]"
            >
              {f.label}: {lbl}
            </span>
          ) : (
            <Chip key={f.param} label={`${f.label}: ${lbl}`} onRemove={() => navigate({ [f.param]: "" })} />
          );
        })}

        {activeCount === 0 && !lockedPath ? (
          <span className="text-xs text-[var(--muted)]">All records — no filters applied</span>
        ) : null}

        <button
          type="button"
          onClick={() => setOpen(true)}
          className="ml-auto inline-flex items-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--panel)] px-3 py-1.5 text-sm font-medium text-[var(--navy)] hover:bg-[var(--panel-2)]"
        >
          <FilterIcon />
          Filters
          {activeCount > 0 ? (
            <span className="grid h-[18px] min-w-[18px] place-items-center rounded-full bg-[var(--gold)] px-1 text-[0.66rem] font-bold text-white">
              {activeCount}
            </span>
          ) : null}
        </button>
      </div>

      {open ? <FilterDrawer {...props} onClose={() => setOpen(false)} navigate={navigate} /> : null}
    </>
  );
}

// ── The right-side drawer: stages changes locally, applies on Apply (one navigation) ──
function FilterDrawer({
  units,
  teams,
  lockedUnitIds,
  lockedTeamId = null,
  org,
  team,
  workItemType = "",
  release = "",
  quarters = [],
  showWorkRelease = true,
  extraFilters = [],
  onClose,
  navigate,
}: Props & { onClose: () => void; navigate: (n: Record<string, string>) => void }) {
  const byId = new Map(units.map((u) => [u.id, u]));
  const lockedSet = new Set(lockedUnitIds);
  const deepestLocked = ORG_TYPES.map((t) => lockedUnitIds.find((x) => byId.get(x)?.type === t))
    .filter(Boolean)
    .pop() as string | undefined;

  // staged draft
  const [dOrg, setDOrg] = useState(org);
  const [dTeam, setDTeam] = useState(team);
  const [dWork, setDWork] = useState(workItemType);
  const [dRelease, setDRelease] = useState(release);
  const [dExtra, setDExtra] = useState<Record<string, string>>(
    Object.fromEntries(extraFilters.map((f) => [f.param, f.value])),
  );

  const sel = selectedFor(dOrg, units, lockedUnitIds);
  const parsed = parseRelease(dRelease);
  const years = yearsFromCatalogue(quarters);
  const yearQuarters = quartersForYear(quarters, parsed.year);
  const crewSel = sel.CREW;
  const podOptions = teams.filter((t) => (crewSel ? t.crewId === crewSel : true));

  function pickOrg(levelType: OrgType, value: string) {
    if (value) {
      setDOrg(value);
      setDTeam("");
    } else {
      const parentType = PARENT_TYPE[levelType];
      setDOrg(parentType ? sel[parentType] ?? "" : "");
      setDTeam("");
    }
  }

  function apply() {
    navigate({ org: dOrg, team: dTeam, workItemType: dWork, release: dRelease, ...dExtra });
    onClose();
  }
  function clearAll() {
    navigate({
      org: deepestLocked ?? "",
      team: lockedTeamId ?? "",
      workItemType: "",
      release: "",
      ...Object.fromEntries(extraFilters.map((f) => [f.param, ""])),
    });
    onClose();
  }

  return (
    <>
      <button aria-label="Close filters" className="fixed inset-0 z-40 bg-[rgba(10,16,32,.35)]" onClick={onClose} />
      <aside
        role="dialog"
        aria-label="Filters"
        className="fixed inset-y-0 right-0 z-50 flex w-[22rem] max-w-[88vw] flex-col border-l border-[var(--line)] bg-[var(--panel)] shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-[var(--line)] px-4 py-3">
          <b className="text-[var(--navy)]">Filters</b>
          <button onClick={onClose} aria-label="Close" className="rounded p-1 text-[var(--muted)] hover:bg-[var(--panel-2)]">
            ✕
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-auto px-4 py-4">
          <div>
            <p className="mb-1 text-[0.7rem] font-semibold uppercase tracking-wide text-[var(--muted)]">Organisation</p>
            {lockedUnitIds.length > 0 ? (
              <p className="mb-2 text-[0.66rem] text-[var(--muted)]">Levels at/above your seat are locked to your scope.</p>
            ) : null}
            {ORG_TYPES.map((levelType) => {
              const parentType = PARENT_TYPE[levelType];
              const parentSel = parentType ? sel[parentType] : undefined;
              const options = units.filter(
                (u) => u.type === levelType && (parentSel ? u.parentId === parentSel : true),
              );
              const value = sel[levelType] ?? "";
              const locked = value !== "" && lockedSet.has(value);
              return (
                <label key={levelType} className="mb-2 block text-sm">
                  {ORG_TYPE_LABEL[levelType]}
                  {locked ? (
                    <select className={SEL_LOCKED} value={value} disabled aria-readonly="true">
                      <option value={value}>{byId.get(value)?.name ?? "—"}</option>
                    </select>
                  ) : (
                    <select className={SEL} value={value} onChange={(e) => pickOrg(levelType, e.target.value)}>
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
            <label className="mb-2 block text-sm">
              Pod / Team
              {lockedTeamId ? (
                <select className={SEL_LOCKED} value={lockedTeamId} disabled aria-readonly="true">
                  <option value={lockedTeamId}>{teams.find((t) => t.id === lockedTeamId)?.name ?? "—"}</option>
                </select>
              ) : (
                <select className={SEL} value={dTeam} onChange={(e) => setDTeam(e.target.value)}>
                  <option value="">All pods</option>
                  {podOptions.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              )}
            </label>
          </div>

          {showWorkRelease ? (
            <div>
              <p className="mb-1 text-[0.7rem] font-semibold uppercase tracking-wide text-[var(--muted)]">Delivery &amp; release</p>
              <label className="mb-2 block text-sm">
                Work type
                <select className={SEL} value={dWork} onChange={(e) => setDWork(e.target.value)}>
                  <option value="">All work types</option>
                  <option value="ISSUE">Issue / Story</option>
                  <option value="EPIC">Epic</option>
                </select>
              </label>
              <label className="mb-2 block text-sm">
                Release year
                <select
                  className={SEL}
                  value={parsed.year}
                  onChange={(e) => {
                    const year = e.target.value;
                    if (!year) return setDRelease("");
                    const qs = quartersForYear(quarters, year);
                    const keep = parsed.quarter && qs.includes(parsed.quarter) ? parsed.quarter : "";
                    setDRelease(keep ? formatRelease(year, keep) : formatReleaseYearOnly(year));
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
              <label className={`mb-2 block text-sm ${parsed.year ? "" : "opacity-60"}`}>
                Release quarter
                <select
                  className={SEL}
                  value={parsed.quarter}
                  disabled={!parsed.year}
                  onChange={(e) => {
                    const q = e.target.value;
                    if (!parsed.year) return;
                    setDRelease(q ? formatRelease(parsed.year, q) : formatReleaseYearOnly(parsed.year));
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
            </div>
          ) : null}

          {extraFilters.length > 0 ? (
            <div>
              <p className="mb-1 text-[0.7rem] font-semibold uppercase tracking-wide text-[var(--muted)]">More</p>
              {extraFilters.map((f) => (
                <label key={f.param} className="mb-2 block text-sm">
                  {f.label}
                  <select
                    className={SEL}
                    value={dExtra[f.param] ?? ""}
                    onChange={(e) => setDExtra((cur) => ({ ...cur, [f.param]: e.target.value }))}
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
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-[var(--line)] px-4 py-3">
          <button onClick={clearAll} className="rounded-lg border border-[var(--line)] bg-[var(--panel)] px-3 py-2 text-sm font-medium text-[var(--navy)] hover:bg-[var(--panel-2)]">
            Clear
          </button>
          <button onClick={apply} className="rounded-lg border border-[var(--gold)] bg-[var(--gold)] px-4 py-2 text-sm font-semibold text-[var(--primary-ink)]">
            Apply
          </button>
        </div>
      </aside>
    </>
  );
}

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[color-mix(in_srgb,var(--gold)_40%,transparent)] bg-[var(--gold-soft)] px-2.5 py-1 text-xs font-medium text-[var(--gold-2)]">
      {label}
      <button type="button" onClick={onRemove} aria-label={`Remove ${label}`} className="cursor-pointer opacity-70 hover:opacity-100">
        ✕
      </button>
    </span>
  );
}

function FilterIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
    </svg>
  );
}
function LockIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}
