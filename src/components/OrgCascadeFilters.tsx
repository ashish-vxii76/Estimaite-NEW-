"use client";

import { useRouter } from "next/navigation";
import type { LockedOrgPathView } from "@/lib/lockedOrgPath";
import type { OrgUnitRow } from "@/lib/orgCascade";

type TeamOption = { id: string; name: string; crewId?: string | null };

const OPEN =
  "mt-1 w-full rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-3 py-2 text-sm text-[var(--navy)]";
const LOCKED =
  "mt-1 w-full cursor-not-allowed rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--navy)] opacity-90";

/**
 * Company → Crew cascade + Pod.
 * - App admin (orgEditable): every level editable.
 * - Other users: path locked to seat; only Pod open.
 */
export function OrgCascadeFilters({
  basePath,
  orgUnits,
  teams,
  orgEditable,
  lockedPath,
  company = "",
  division = "",
  subDivision = "",
  stream = "",
  crew = "",
  team = "",
  extraParams = {},
}: {
  basePath: string;
  orgUnits: OrgUnitRow[];
  teams: TeamOption[];
  orgEditable: boolean;
  lockedPath: LockedOrgPathView;
  company?: string;
  division?: string;
  subDivision?: string;
  stream?: string;
  crew?: string;
  team?: string;
  extraParams?: Record<string, string>;
}) {
  const router = useRouter();

  function push(next: {
    company?: string;
    division?: string;
    subDivision?: string;
    stream?: string;
    crew?: string;
    team?: string;
  }) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(extraParams)) {
      if (v) params.set(k, v);
    }
    const co = next.company ?? company;
    const di = next.division ?? division;
    const su = next.subDivision ?? subDivision;
    const st = next.stream ?? stream;
    const cr = next.crew ?? crew;
    const tm = next.team ?? team;
    if (co) params.set("company", co);
    if (di) params.set("division", di);
    if (su) params.set("subDivision", su);
    if (st) params.set("stream", st);
    if (cr) params.set("crew", cr);
    if (tm) params.set("team", tm);
    const qs = params.toString();
    router.push(qs ? `${basePath}?${qs}` : basePath);
  }

  const companies = orgUnits.filter((u) => u.type === "COMPANY");
  const divisions = orgUnits.filter(
    (u) => u.type === "DIVISION" && (!company || u.parentId === company),
  );
  const subs = orgUnits.filter(
    (u) => u.type === "SUB_DIVISION" && (!division || u.parentId === division),
  );
  const streams = orgUnits.filter(
    (u) => u.type === "STREAM" && (!subDivision || u.parentId === subDivision),
  );
  const crews = orgUnits.filter(
    (u) => u.type === "CREW" && (!stream || u.parentId === stream),
  );
  const pods = teams.filter((t) => !crew || t.crewId === crew);

  if (!orgEditable) {
    return (
      <section className="card space-y-3 p-5">
        <p className="text-xs text-[var(--muted)]">
          Organisation path is locked to your seat. Only Pod / Team is open.
        </p>
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <Locked label="Company" value={lockedPath.companyName} />
          <Locked label="Division" value={lockedPath.divisionName} />
          <Locked label="Sub-Division" value={lockedPath.subDivisionName} />
          <Locked label="Stream" value={lockedPath.streamName} />
          <Locked label="Crew" value={lockedPath.crewName} />
          <label className="text-sm">
            Pod / Team
            <select
              className={OPEN}
              value={team}
              onChange={(e) => push({ team: e.target.value })}
            >
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

  return (
    <section className="card space-y-3 p-5">
      <p className="text-xs text-[var(--muted)]">
        App admin: full organisation cascade is editable. Clear a level to widen the roll-up.
      </p>
      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        <label className="text-sm">
          Company
          <select
            className={OPEN}
            value={company}
            onChange={(e) =>
              push({
                company: e.target.value,
                division: "",
                subDivision: "",
                stream: "",
                crew: "",
                team: "",
              })
            }
          >
            <option value="">All companies</option>
            {companies.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </label>
        <label className={`text-sm ${company ? "" : "opacity-60"}`}>
          Division
          <select
            className={OPEN}
            value={division}
            disabled={!company}
            onChange={(e) =>
              push({
                division: e.target.value,
                subDivision: "",
                stream: "",
                crew: "",
                team: "",
              })
            }
          >
            <option value="">{company ? "All divisions" : "Select company"}</option>
            {divisions.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </label>
        <label className={`text-sm ${division ? "" : "opacity-60"}`}>
          Sub-Division
          <select
            className={OPEN}
            value={subDivision}
            disabled={!division}
            onChange={(e) =>
              push({
                subDivision: e.target.value,
                stream: "",
                crew: "",
                team: "",
              })
            }
          >
            <option value="">{division ? "All sub-divisions" : "Select division"}</option>
            {subs.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </label>
        <label className={`text-sm ${subDivision ? "" : "opacity-60"}`}>
          Stream
          <select
            className={OPEN}
            value={stream}
            disabled={!subDivision}
            onChange={(e) =>
              push({
                stream: e.target.value,
                crew: "",
                team: "",
              })
            }
          >
            <option value="">{subDivision ? "All streams" : "Select sub-division"}</option>
            {streams.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </label>
        <label className={`text-sm ${stream ? "" : "opacity-60"}`}>
          Crew
          <select
            className={OPEN}
            value={crew}
            disabled={!stream}
            onChange={(e) => push({ crew: e.target.value, team: "" })}
          >
            <option value="">{stream ? "All crews" : "Select stream"}</option>
            {crews.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Pod / Team
          <select
            className={OPEN}
            value={team}
            onChange={(e) => push({ team: e.target.value })}
          >
            <option value="">All pods</option>
            {pods.map((t) => (
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

function Locked({ label, value }: { label: string; value: string }) {
  return (
    <label className="text-sm">
      {label}
      <input className={LOCKED} value={value} readOnly tabIndex={-1} aria-readonly="true" />
    </label>
  );
}
