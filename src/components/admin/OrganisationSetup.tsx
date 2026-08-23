"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ORG_CHILD_TYPE,
  ORG_SEAT_LABEL,
  ORG_SEAT_TYPES,
  ORG_TYPE_LABEL,
  ORG_TYPES,
  type OrgSeatType,
  type OrgType,
} from "@/lib/orgTypes";

type Unit = { id: string; type: string; name: string; parentId: string | null; active: boolean };
type TeamRow = { id: string; name: string; crewId: string | null; active: boolean };
type SeatRow = {
  id: string;
  seatType: string;
  user: { id: string; email: string; name: string; role: string };
  orgUnit: Unit;
};
type UserOption = { id: string; email: string; name: string; role: string };

export function OrganisationSetup({
  initialUnits,
  initialTeams,
  initialSeats,
  users,
  canEdit,
}: {
  initialUnits: Unit[];
  initialTeams: TeamRow[];
  initialSeats: SeatRow[];
  users: UserOption[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [units, setUnits] = useState(initialUnits);
  const [teams, setTeams] = useState(initialTeams);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [type, setType] = useState<OrgType>("DIVISION");
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState("");
  const [seatUserId, setSeatUserId] = useState(users[0]?.id ?? "");
  const [seatOrgId, setSeatOrgId] = useState("");
  const [seatType, setSeatType] = useState<OrgSeatType>("CREW_TECH_LEAD");

  const parentsForType = useMemo(() => {
    const parentType =
      type === "COMPANY"
        ? null
        : type === "DIVISION"
          ? "COMPANY"
          : type === "SUB_DIVISION"
            ? "DIVISION"
            : type === "STREAM"
              ? "SUB_DIVISION"
              : "STREAM";
    if (!parentType) return [];
    return units.filter((u) => u.type === parentType && u.active);
  }, [type, units]);

  const crews = units.filter((u) => u.type === "CREW" && u.active);

  async function refresh() {
    const res = await fetch("/api/admin/organisation");
    const data = await res.json();
    if (res.ok) {
      setUnits(data.units);
      setTeams(data.teams);
    }
    router.refresh();
  }

  async function createUnit() {
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/organisation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "createUnit",
          type,
          name,
          parentId: type === "COMPANY" ? null : parentId || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setName("");
      setMessage(`Created ${ORG_TYPE_LABEL[type]} ${data.unit.name}`);
      await refresh();
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function linkTeam(teamId: string, crewId: string) {
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/organisation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "setTeamCrew", teamId, crewId: crewId || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setMessage(`Linked pod ${data.team.name}`);
      await refresh();
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function saveSeat() {
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/organisation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "setPrimarySeat",
          userId: seatUserId,
          orgUnitId: seatOrgId,
          seatType,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setMessage("Primary org seat saved");
      await refresh();
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="kicker">Organisation</p>
        <h1 className="font-display text-2xl font-semibold text-[var(--navy)]">Organisation setup</h1>
        <p className="mt-1 max-w-3xl text-sm text-[var(--muted)]">
          Company → Division → Sub-Division → Stream → Crew. Pods/Teams attach under Crew. Primary
          seats drive org level scope with Role × Feature RBAC.
        </p>
      </header>

      <section className="card space-y-3 p-5">
        <h2 className="font-medium text-[var(--navy)]">Add org unit</h2>
        <div className="grid gap-3 md:grid-cols-4">
          <label className="text-sm">
            Level
            <select
              className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2"
              value={type}
              disabled={!canEdit}
              onChange={(e) => {
                const next = e.target.value as OrgType;
                setType(next);
                setParentId("");
              }}
            >
              {ORG_TYPES.map((t) => (
                <option key={t} value={t}>
                  {ORG_TYPE_LABEL[t]}
                </option>
              ))}
            </select>
          </label>
          {type !== "COMPANY" ? (
            <label className="text-sm md:col-span-2">
              Parent
              <select
                className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2"
                value={parentId}
                disabled={!canEdit}
                onChange={(e) => setParentId(e.target.value)}
              >
                <option value="">Select parent</option>
                {parentsForType.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <p className="md:col-span-2 self-end text-sm text-[var(--muted)]">Company is the root.</p>
          )}
          <label className="text-sm">
            Name
            <input
              className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2"
              value={name}
              disabled={!canEdit}
              onChange={(e) => setName(e.target.value)}
              placeholder={type === "CREW" ? "IBRL" : "Name"}
            />
          </label>
        </div>
        {canEdit ? (
          <button type="button" className="btn-primary" disabled={busy} onClick={createUnit}>
            {busy ? "Saving…" : `Add ${ORG_TYPE_LABEL[type]}`}
          </button>
        ) : null}
      </section>

      <section className="card space-y-3 p-5">
        <h2 className="font-medium text-[var(--navy)]">Tree</h2>
        <ul className="space-y-1 text-sm">
          {ORG_TYPES.map((level) => (
            <li key={level}>
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                {ORG_TYPE_LABEL[level]}
              </p>
              <ul className="ml-3 mt-1 space-y-1">
                {units
                  .filter((u) => u.type === level)
                  .map((u) => (
                    <li key={u.id} className={!u.active ? "opacity-50" : ""}>
                      {u.name}
                      <span className="ml-2 text-xs text-[var(--muted)]">{u.id.slice(0, 6)}</span>
                      {!u.active ? " (inactive)" : ""}
                    </li>
                  ))}
              </ul>
            </li>
          ))}
        </ul>
      </section>

      <section className="card space-y-3 p-5">
        <h2 className="font-medium text-[var(--navy)]">Attach pods to Crew</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-[var(--muted)]">
                <th className="py-2">Pod / Team</th>
                <th className="py-2">Crew</th>
              </tr>
            </thead>
            <tbody>
              {teams.map((t) => (
                <tr key={t.id} className="border-t border-[var(--line)]">
                  <td className="py-2 font-medium">{t.name}</td>
                  <td className="py-2">
                    <select
                      className="rounded-lg border border-[var(--line)] px-2 py-1"
                      value={t.crewId ?? ""}
                      disabled={!canEdit}
                      onChange={(e) => linkTeam(t.id, e.target.value)}
                    >
                      <option value="">Unassigned</option>
                      {crews.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card space-y-3 p-5">
        <h2 className="font-medium text-[var(--navy)]">Primary org seat</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <label className="text-sm">
            User
            <select
              className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2"
              value={seatUserId}
              disabled={!canEdit}
              onChange={(e) => setSeatUserId(e.target.value)}
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role})
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Org node
            <select
              className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2"
              value={seatOrgId}
              disabled={!canEdit}
              onChange={(e) => setSeatOrgId(e.target.value)}
            >
              <option value="">Select node</option>
              {units
                .filter((u) => u.active)
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {ORG_TYPE_LABEL[u.type as OrgType] ?? u.type}: {u.name}
                  </option>
                ))}
            </select>
          </label>
          <label className="text-sm">
            Seat
            <select
              className="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2"
              value={seatType}
              disabled={!canEdit}
              onChange={(e) => setSeatType(e.target.value as OrgSeatType)}
            >
              {ORG_SEAT_TYPES.map((s) => (
                <option key={s} value={s}>
                  {ORG_SEAT_LABEL[s]}
                </option>
              ))}
            </select>
          </label>
        </div>
        {canEdit ? (
          <button type="button" className="btn-primary" disabled={busy || !seatOrgId} onClick={saveSeat}>
            Save primary seat
          </button>
        ) : null}
        <ul className="mt-3 space-y-1 text-sm text-[var(--muted)]">
          {initialSeats.map((s) => (
            <li key={s.id}>
              {s.user.name} → {ORG_SEAT_LABEL[s.seatType as OrgSeatType] ?? s.seatType} @{" "}
              {s.orgUnit.name}
            </li>
          ))}
        </ul>
      </section>

      {message ? <p className="text-sm text-[var(--navy)]">{message}</p> : null}
      <p className="text-xs text-[var(--muted)]">
        Child of {type}: {ORG_CHILD_TYPE[type] ? ORG_TYPE_LABEL[ORG_CHILD_TYPE[type]!] : "Pods under Crew"}
      </p>
    </div>
  );
}
