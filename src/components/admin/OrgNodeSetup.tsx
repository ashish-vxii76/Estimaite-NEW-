"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Plus, Users } from "lucide-react";
import { ORG_SEAT_LABEL, ORG_TYPE_LABEL, type OrgSeatType, type OrgType } from "@/lib/orgTypes";

/** RefineIQ-style per-level organisation workspace: Company → Pod, seats + composition folded in. */

type Level = OrgType | "POD";
const LEVELS: Level[] = ["COMPANY", "DIVISION", "SUB_DIVISION", "STREAM", "CREW", "POD"];
const LEVEL_TITLE: Record<Level, string> = { ...ORG_TYPE_LABEL, POD: "Pod / Team" };

// Levels above a given level, used to build the parent cascade in the add form.
const PARENTS: Record<Level, OrgType[]> = {
  COMPANY: [],
  DIVISION: ["COMPANY"],
  SUB_DIVISION: ["COMPANY", "DIVISION"],
  STREAM: ["COMPANY", "DIVISION", "SUB_DIVISION"],
  CREW: ["COMPANY", "DIVISION", "SUB_DIVISION", "STREAM"],
  POD: ["COMPANY", "DIVISION", "SUB_DIVISION", "STREAM", "CREW"],
};

// Seat types offered at each org level (Pod uses team composition instead of seats).
const SEATS_FOR: Partial<Record<Level, OrgSeatType[]>> = {
  COMPANY: ["CEO", "CIO", "CTO", "CXO"],
  DIVISION: ["DIVISION_TECH_LEAD", "DIVISION_PRODUCT_LEAD"],
  SUB_DIVISION: ["SUB_DIVISION_TECH_LEAD", "SUB_DIVISION_PRODUCT_LEAD"],
  STREAM: ["STREAM_TECH_LEAD", "STREAM_PRODUCT_LEAD"],
  CREW: ["CREW_TECH_LEAD", "CREW_PRODUCT_LEAD"],
};

export type Unit = { id: string; type: string; name: string; parentId: string | null; active: boolean };
export type TeamRow = { id: string; name: string; crewId: string | null; active: boolean };
export type SeatRow = {
  id: string;
  seatType: string;
  orgUnitId: string;
  user: { id: string; email: string; name: string; role: string };
};
export type MemberRow = {
  id: string;
  teamId: string;
  name: string;
  roleStream: string;
  resourceLevel: string;
  location: string;
};
export type UserOption = { id: string; email: string; name: string; role: string };

async function post(body: Record<string, unknown>) {
  const res = await fetch("/api/admin/organisation", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error ?? "Request failed");
  return res.json();
}

export function OrgNodeSetup({
  units,
  teams,
  seats,
  members,
  users,
  locations,
  levels,
  canEdit,
}: {
  units: Unit[];
  teams: TeamRow[];
  seats: SeatRow[];
  members: MemberRow[];
  users: UserOption[];
  locations: string[];
  levels: string[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [level, setLevel] = useState<Level>("COMPANY");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [chain, setChain] = useState<string[]>([]);

  const nameById = useMemo(() => Object.fromEntries(units.map((u) => [u.id, u.name])), [units]);
  const crewNameById = useMemo(
    () => Object.fromEntries(units.filter((u) => u.type === "CREW").map((u) => [u.id, u.name])),
    [units],
  );
  const childCount = useMemo(() => {
    const c: Record<string, number> = {};
    units.forEach((u) => u.parentId && (c[u.parentId] = (c[u.parentId] ?? 0) + 1));
    teams.forEach((t) => t.crewId && (c[t.crewId] = (c[t.crewId] ?? 0) + 1));
    return c;
  }, [units, teams]);

  const parents = PARENTS[level];
  function chainOptions(i: number): Unit[] {
    const lvl = parents[i];
    return units.filter((u) => u.active && u.type === lvl && (i === 0 || u.parentId === chain[i - 1]));
  }
  const parentId = parents.length === 0 ? null : chain[parents.length - 1] ?? null;
  const canAdd = name.trim().length > 0 && (parents.length === 0 || !!parentId);

  async function refresh() {
    router.refresh();
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (level === "POD") {
        const res = await fetch("/api/teams", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: name.trim(), crewId: parentId }),
        });
        if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error ?? "Could not create pod");
      } else {
        await post({ action: "createUnit", type: level, name: name.trim(), parentId });
      }
      setName("");
      setChain([]);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create");
    } finally {
      setBusy(false);
    }
  }

  const orgNodes = units.filter((u) => u.active && u.type === level);
  const podNodes = teams.filter((t) => t.active);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-[var(--navy)]">Organisation setup</h1>
        <p className="mt-1 max-w-2xl text-sm text-[var(--muted)]">
          Build the hierarchy top-down: Company → Division → Sub-Division → Stream → Crew → Pod.
          Assign leadership on each node; Pods carry their team composition.
        </p>
      </div>

      {/* Level switcher */}
      <div className="flex flex-wrap gap-1.5">
        {LEVELS.map((lvl) => {
          const count = lvl === "POD" ? podNodes.length : units.filter((u) => u.active && u.type === lvl).length;
          const on = lvl === level;
          return (
            <button
              key={lvl}
              type="button"
              onClick={() => {
                setLevel(lvl);
                setChain([]);
                setName("");
                setError(null);
              }}
              className={`rounded-full border px-3 py-1.5 text-sm transition ${
                on
                  ? "border-[var(--gold)] bg-[var(--gold-soft)] font-semibold text-[var(--navy)]"
                  : "border-[var(--line)] text-[var(--muted)] hover:text-[var(--navy)]"
              }`}
            >
              {LEVEL_TITLE[lvl]}
              <span className="ml-1.5 text-xs opacity-70">{count}</span>
            </button>
          );
        })}
      </div>

      {error && (
        <div className="rounded-lg border border-[var(--danger)] bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] px-3 py-2 text-sm text-[var(--danger)]">
          {error}
        </div>
      )}

      {/* Add form */}
      {canEdit && (
        <form onSubmit={handleAdd} className="card p-5">
          <div className="flex flex-wrap items-end gap-3">
            {parents.map((lvl, i) => (
              <label key={lvl} className="text-sm">
                <span className="mb-1 block text-xs font-medium text-[var(--muted)]">{ORG_TYPE_LABEL[lvl]}</span>
                <select
                  className="min-w-[11rem] rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-3 py-2 text-sm text-[var(--navy)]"
                  value={chain[i] ?? ""}
                  onChange={(e) => setChain((c) => [...c.slice(0, i), e.target.value].filter(Boolean))}
                >
                  <option value="">Select…</option>
                  {chainOptions(i).map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </label>
            ))}
            <label className="flex-1 text-sm">
              <span className="mb-1 block text-xs font-medium text-[var(--muted)]">{LEVEL_TITLE[level]} name</span>
              <input
                className="w-full rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-3 py-2 text-sm text-[var(--navy)]"
                placeholder={`New ${LEVEL_TITLE[level].toLowerCase()} name`}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <button className="btn-primary inline-flex items-center gap-1.5" disabled={!canAdd || busy}>
              <Plus size={16} /> {busy ? "Adding…" : `Add ${LEVEL_TITLE[level]}`}
            </button>
          </div>
        </form>
      )}

      {/* Node cards */}
      {level === "POD" ? (
        podNodes.length === 0 ? (
          <Empty label="pods" canEdit={canEdit} />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {podNodes.map((t) => (
              <PodCard
                key={t.id}
                team={t}
                crewName={t.crewId ? crewNameById[t.crewId] ?? null : null}
                members={members.filter((m) => m.teamId === t.id)}
                locations={locations}
                levels={levels}
                canEdit={canEdit}
                onChanged={refresh}
              />
            ))}
          </div>
        )
      ) : orgNodes.length === 0 ? (
        <Empty label={`${LEVEL_TITLE[level].toLowerCase()}s`} canEdit={canEdit} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {orgNodes.map((n) => (
            <OrgCard
              key={n.id}
              node={n}
              level={level}
              parentName={n.parentId ? nameById[n.parentId] ?? null : null}
              childCount={childCount[n.id] ?? 0}
              seats={seats.filter((s) => s.orgUnitId === n.id)}
              users={users}
              canEdit={canEdit}
              onChanged={refresh}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Empty({ label, canEdit }: { label: string; canEdit: boolean }) {
  return (
    <div className="rounded-xl border border-dashed border-[var(--line)] bg-[var(--panel-2)] p-8 text-center text-sm text-[var(--muted)]">
      No {label} yet{canEdit ? " — add one above." : "."}
    </div>
  );
}

function OrgCard({
  node,
  level,
  parentName,
  childCount,
  seats,
  users,
  canEdit,
  onChanged,
}: {
  node: Unit;
  level: Level;
  parentName: string | null;
  childCount: number;
  seats: SeatRow[];
  users: UserOption[];
  canEdit: boolean;
  onChanged: () => Promise<void>;
}) {
  const seatTypes = SEATS_FOR[level] ?? [];
  const [seatType, setSeatType] = useState<string>(seatTypes[0] ?? "ORG_ADMIN");
  const [userId, setUserId] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function assign() {
    if (!userId) return setErr("Pick a user");
    setErr(null);
    setBusy(true);
    try {
      await post({ action: "setPrimarySeat", userId, orgUnitId: node.id, seatType });
      setUserId("");
      await onChanged();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not assign");
    } finally {
      setBusy(false);
    }
  }

  async function archive() {
    setErr(null);
    try {
      await post({ action: "updateUnit", id: node.id, active: false });
      await onChanged();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not archive");
    }
  }

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-[var(--navy)]">{node.name}</h3>
          <p className="text-xs text-[var(--muted)]">
            {parentName ? `under ${parentName}` : "root"}
            {childCount > 0 && ` · ${childCount} child unit${childCount === 1 ? "" : "s"}`}
          </p>
        </div>
        {canEdit && (
          <button
            onClick={archive}
            className="rounded p-1.5 text-[var(--muted)] hover:text-[var(--danger)]"
            title="Archive"
            aria-label="Archive"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>

      <p className="mt-4 mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Leadership</p>
      <div className="flex flex-wrap gap-2">
        {seats.length === 0 && <span className="text-sm text-[var(--muted)]">None assigned yet.</span>}
        {seats.map((s) => (
          <span
            key={s.id}
            className="inline-flex items-center gap-1.5 rounded-full bg-[var(--panel-2)] px-2.5 py-1 text-xs text-[var(--navy)]"
          >
            <span className="font-medium">{s.user.name}</span>
            <span className="text-[var(--muted)]">· {ORG_SEAT_LABEL[s.seatType as OrgSeatType] ?? s.seatType}</span>
          </span>
        ))}
      </div>

      {canEdit && seatTypes.length > 0 && (
        <div className="mt-4 rounded-lg border border-[var(--line)] bg-[var(--panel-2)] p-3">
          {err && <p className="mb-2 text-xs text-[var(--danger)]">{err}</p>}
          <div className="flex flex-wrap items-center gap-2">
            <select
              className="rounded-md border border-[var(--line)] bg-[var(--panel)] px-2 py-1.5 text-sm text-[var(--navy)]"
              value={seatType}
              onChange={(e) => setSeatType(e.target.value)}
            >
              {seatTypes.map((r) => (
                <option key={r} value={r}>
                  {ORG_SEAT_LABEL[r]}
                </option>
              ))}
            </select>
            <select
              className="flex-1 rounded-md border border-[var(--line)] bg-[var(--panel)] px-2 py-1.5 text-sm text-[var(--navy)]"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
            >
              <option value="">Select user…</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.email})
                </option>
              ))}
            </select>
            <button onClick={assign} disabled={busy} className="btn-secondary px-3 py-1.5 text-sm">
              {busy ? "Adding…" : "Assign"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function PodCard({
  team,
  crewName,
  members,
  locations,
  levels,
  canEdit,
  onChanged,
}: {
  team: TeamRow;
  crewName: string | null;
  members: MemberRow[];
  locations: string[];
  levels: string[];
  canEdit: boolean;
  onChanged: () => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [roleStream, setRoleStream] = useState("DEV");
  const [level, setLevel] = useState(levels[0] ?? "");
  const [location, setLocation] = useState(locations[0] ?? "India");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function addMember() {
    if (name.trim().length < 2) return setErr("Enter a member name");
    setErr(null);
    setBusy(true);
    try {
      await post({
        action: "addMember",
        teamId: team.id,
        name: name.trim(),
        roleStream,
        resourceLevel: level,
        location,
      });
      setName("");
      await onChanged();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not add member");
    } finally {
      setBusy(false);
    }
  }

  async function removeMember(memberId: string) {
    await post({ action: "removeMember", memberId }).catch(() => {});
    await onChanged();
  }

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-[var(--navy)]">{team.name}</h3>
          <p className="text-xs text-[var(--muted)]">
            {crewName ? `under ${crewName}` : "no crew"}
            {` · ${members.length} member${members.length === 1 ? "" : "s"}`}
          </p>
        </div>
        <span className="inline-flex items-center gap-1 text-xs text-[var(--muted)]">
          <Users size={13} /> Composition
        </span>
      </div>

      <p className="mt-4 mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Members</p>
      {members.length === 0 ? (
        <span className="text-sm text-[var(--muted)]">No members yet.</span>
      ) : (
        <ul className="space-y-1 text-sm">
          {members.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-3">
              <span className="text-[var(--navy)]">{m.name}</span>
              <span className="flex items-center gap-2">
                <span className="text-xs text-[var(--muted)]">
                  {m.roleStream} · {m.resourceLevel} · {m.location}
                </span>
                {canEdit && (
                  <button
                    onClick={() => removeMember(m.id)}
                    className="text-[var(--muted)] hover:text-[var(--danger)]"
                    aria-label="Remove member"
                    title="Remove member"
                  >
                    ✕
                  </button>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}

      {canEdit && (
        <div className="mt-4 rounded-lg border border-[var(--line)] bg-[var(--panel-2)] p-3">
          {err && <p className="mb-2 text-xs text-[var(--danger)]">{err}</p>}
          <div className="flex flex-wrap items-center gap-2">
            <input
              className="min-w-[8rem] flex-1 rounded-md border border-[var(--line)] bg-[var(--panel)] px-2 py-1.5 text-sm text-[var(--navy)]"
              placeholder="Member name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <select
              className="rounded-md border border-[var(--line)] bg-[var(--panel)] px-2 py-1.5 text-sm text-[var(--navy)]"
              value={roleStream}
              onChange={(e) => setRoleStream(e.target.value)}
            >
              <option value="DEV">DEV</option>
              <option value="QA">QA</option>
            </select>
            <select
              className="rounded-md border border-[var(--line)] bg-[var(--panel)] px-2 py-1.5 text-sm text-[var(--navy)]"
              value={level}
              onChange={(e) => setLevel(e.target.value)}
            >
              {levels.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
            <select
              className="rounded-md border border-[var(--line)] bg-[var(--panel)] px-2 py-1.5 text-sm text-[var(--navy)]"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            >
              {locations.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
            <button onClick={addMember} disabled={busy} className="btn-secondary px-3 py-1.5 text-sm">
              {busy ? "Adding…" : "Add"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
