"use client";

import { Fragment, useState } from "react";
import { ROLES, roleLabel } from "@/lib/roles";

type UserRow = {
  id: string;
  email: string;
  name: string;
  role: string;
  active: boolean;
  teamId?: string | null;
  pendingApproval?: boolean;
  resetRequestedAt?: string | Date | null;
};

export type GrantRow = {
  id: string;
  userId: string;
  role: string;
  label: string | null;
  teamId: string | null;
  orgUnitId: string | null;
  isPrimary: boolean;
  scopeName: string | null;
};

type OrgUnit = { id: string; name: string; type: string };

const UNIT_LABEL: Record<string, string> = {
  COMPANY: "Company",
  DIVISION: "Division",
  SUB_DIVISION: "Sub-Division",
  STREAM: "Stream",
  CREW: "Crew",
};

export function UsersAdmin({
  initial,
  teams,
  orgUnits,
  grantsByUser,
}: {
  initial: UserRow[];
  teams: { id: string; name: string }[];
  orgUnits: OrgUnit[];
  grantsByUser: Record<string, GrantRow[]>;
}) {
  const [rows, setRows] = useState(initial);
  const [grants, setGrants] = useState<Record<string, GrantRow[]>>(grantsByUser);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "demo1234",
    role: "REQUESTER",
    teamId: "",
  });

  async function createUser() {
    setMessage("");
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error ?? "Could not create login");
      return;
    }
    setRows((current) => [...current, data.user].sort((a, b) => a.name.localeCompare(b.name)));
    setForm({ name: "", email: "", password: "demo1234", role: "REQUESTER", teamId: "" });
    setMessage("Login created. The person can sign in with that profile.");
  }

  async function updateUser(id: string, patch: Partial<UserRow> & { password?: string }) {
    setMessage("");
    const res = await fetch("/api/admin/users", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...patch }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error ?? "Could not update login");
      return;
    }
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...data.user } : row)));
  }

  function setUserGrants(userId: string, list: GrantRow[]) {
    setGrants((cur) => ({ ...cur, [userId]: list }));
  }

  async function addGrant(userId: string, draft: { role: string; label: string; scope: string }) {
    setMessage("");
    const teamId = draft.scope.startsWith("team:") ? draft.scope.slice(5) : null;
    const orgUnitId = draft.scope.startsWith("unit:") ? draft.scope.slice(5) : null;
    const res = await fetch("/api/admin/role-grants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, role: draft.role, label: draft.label || null, teamId, orgUnitId }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error ?? "Could not add role");
      return;
    }
    const list = grants[userId] ?? [];
    // A new primary demotes the others locally too.
    const next = data.grant.isPrimary ? list.map((g) => ({ ...g, isPrimary: false })) : list;
    setUserGrants(userId, [...next, data.grant]);
  }

  async function removeGrant(userId: string, id: string) {
    setMessage("");
    const res = await fetch(`/api/admin/role-grants?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMessage(data.error ?? "Could not remove role");
      return;
    }
    setUserGrants(userId, (grants[userId] ?? []).filter((g) => g.id !== id));
  }

  async function setPrimary(userId: string, id: string) {
    setMessage("");
    const res = await fetch("/api/admin/role-grants", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMessage(data.error ?? "Could not set primary");
      return;
    }
    setUserGrants(
      userId,
      (grants[userId] ?? []).map((g) => ({ ...g, isPrimary: g.id === id })),
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Login credentials</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Each login is a person. The primary role decides functions (RW / R / none) and scope at
          sign-in. Grant extra roles under <strong>Roles</strong> — the person switches between them
          from the sidebar; one is active at a time. Admin sees every team.
        </p>
      </div>

      <section className="card grid gap-3 p-5 md:grid-cols-2">
        <h2 className="md:col-span-2 font-medium">Create login</h2>
        <Field label="Full name">
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </Field>
        <Field label="Email">
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </Field>
        <Field label="Password">
          <input
            type="text"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </Field>
        <Field label="Role / profile">
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            {ROLES.map((role) => (
              <option key={role} value={role}>
                {roleLabel(role)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Team">
          <select value={form.teamId} onChange={(e) => setForm({ ...form, teamId: e.target.value })}>
            <option value="">None (Admin / all teams)</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </Field>
        <div className="md:col-span-2">
          <button className="btn-primary" onClick={createUser}>
            Create login
          </button>
        </div>
      </section>

      {message ? <p className="text-sm text-[var(--ok)]">{message}</p> : null}

      <section className="card overflow-x-auto">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="bg-[var(--panel-2)] text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Team</th>
              <th>Active</th>
              <th>Roles</th>
              <th>Status</th>
              <th>Reset password</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const userGrants = grants[row.id] ?? [];
              const isOpen = expanded === row.id;
              return (
                <Fragment key={row.id}>
                  <tr className="border-t border-[var(--line)]">
                    <td className="px-4 py-2">{row.name}</td>
                    <td>{row.email}</td>
                    <td>
                      <select
                        className="rounded border border-[var(--line)] bg-[var(--panel-2)] px-2 py-1"
                        value={row.role}
                        onChange={(e) => updateUser(row.id, { role: e.target.value })}
                      >
                        {ROLES.map((role) => (
                          <option key={role} value={role}>
                            {roleLabel(role)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <select
                        className="rounded border border-[var(--line)] bg-[var(--panel-2)] px-2 py-1"
                        value={row.teamId ?? ""}
                        onChange={(e) => updateUser(row.id, { teamId: e.target.value || null })}
                      >
                        <option value="">All teams</option>
                        {teams.map((team) => (
                          <option key={team.id} value={team.id}>
                            {team.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <button
                        className="text-xs text-[var(--navy)] underline"
                        onClick={() => updateUser(row.id, { active: !row.active })}
                      >
                        {row.active ? "Active" : "Disabled"}
                      </button>
                    </td>
                    <td>
                      <button
                        className="text-xs text-[var(--navy)] underline"
                        onClick={() => setExpanded(isOpen ? null : row.id)}
                      >
                        {userGrants.length > 0 ? `Roles (${userGrants.length})` : "Add roles"}
                      </button>
                    </td>
                    <td className="text-xs text-[var(--muted)]">
                      {row.pendingApproval ? (
                        <button
                          className="text-[var(--navy)] underline"
                          onClick={() => updateUser(row.id, { active: true })}
                        >
                          Approve request
                        </button>
                      ) : row.resetRequestedAt ? (
                        "Reset requested"
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>
                      <button
                        className="text-xs text-[var(--navy)] underline"
                        onClick={() => {
                          const password = window.prompt("New password (min 8 characters)", "demo1234");
                          if (password) updateUser(row.id, { password });
                        }}
                      >
                        Set password
                      </button>
                    </td>
                  </tr>
                  {isOpen ? (
                    <tr className="border-t border-[var(--line)] bg-[var(--panel-2)]">
                      <td colSpan={8} className="px-4 py-3">
                        <RolesPanel
                          grants={userGrants}
                          teams={teams}
                          orgUnits={orgUnits}
                          onAdd={(draft) => addGrant(row.id, draft)}
                          onRemove={(id) => removeGrant(row.id, id)}
                          onPrimary={(id) => setPrimary(row.id, id)}
                        />
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function RolesPanel({
  grants,
  teams,
  orgUnits,
  onAdd,
  onRemove,
  onPrimary,
}: {
  grants: GrantRow[];
  teams: { id: string; name: string }[];
  orgUnits: OrgUnit[];
  onAdd: (draft: { role: string; label: string; scope: string }) => void;
  onRemove: (id: string) => void;
  onPrimary: (id: string) => void;
}) {
  const [draft, setDraft] = useState({ role: "ESTIMATOR", label: "", scope: "" });

  return (
    <div className="space-y-3">
      <p className="text-xs text-[var(--muted)]">
        The <strong>primary</strong> role is applied at sign-in. Extra roles appear in the person’s
        Switch-Role control. A single role means no switcher.
      </p>

      {grants.length === 0 ? (
        <p className="text-xs text-[var(--muted)]">No roles yet — add one below.</p>
      ) : (
        <ul className="space-y-1">
          {grants.map((g) => (
            <li key={g.id} className="flex flex-wrap items-center gap-2 text-xs">
              <span className="min-w-[9rem] font-medium">{g.label || roleLabel(g.role)}</span>
              <span className="rounded bg-[var(--panel)] px-1.5 py-0.5 text-[var(--muted)]">
                {roleLabel(g.role)}
              </span>
              <span className="text-[var(--muted)]">{g.scopeName ? `· ${g.scopeName}` : "· (no scope)"}</span>
              {g.isPrimary ? (
                <span className="chip-ok rounded px-1.5 py-0.5">Primary</span>
              ) : (
                <button className="text-[var(--navy)] underline" onClick={() => onPrimary(g.id)}>
                  Make primary
                </button>
              )}
              <button className="text-[var(--danger)] underline" onClick={() => onRemove(g.id)}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-end gap-2 border-t border-[var(--line)] pt-3">
        <label className="text-xs">
          <span className="mb-1 block text-[var(--muted)]">Role</span>
          <select
            className="rounded border border-[var(--line)] bg-[var(--panel)] px-2 py-1"
            value={draft.role}
            onChange={(e) => setDraft({ ...draft, role: e.target.value })}
          >
            {ROLES.map((role) => (
              <option key={role} value={role}>
                {roleLabel(role)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs">
          <span className="mb-1 block text-[var(--muted)]">Title (optional)</span>
          <input
            className="rounded border border-[var(--line)] bg-[var(--panel)] px-2 py-1"
            placeholder="e.g. Deputy Crew Tech Lead"
            value={draft.label}
            onChange={(e) => setDraft({ ...draft, label: e.target.value })}
          />
        </label>
        <label className="text-xs">
          <span className="mb-1 block text-[var(--muted)]">Scope</span>
          <select
            className="rounded border border-[var(--line)] bg-[var(--panel)] px-2 py-1"
            value={draft.scope}
            onChange={(e) => setDraft({ ...draft, scope: e.target.value })}
          >
            <option value="">None</option>
            <optgroup label="Pods">
              {teams.map((t) => (
                <option key={t.id} value={`team:${t.id}`}>
                  {t.name}
                </option>
              ))}
            </optgroup>
            <optgroup label="Org units">
              {orgUnits.map((u) => (
                <option key={u.id} value={`unit:${u.id}`}>
                  {UNIT_LABEL[u.type] ?? u.type}: {u.name}
                </option>
              ))}
            </optgroup>
          </select>
        </label>
        <button
          className="btn-primary text-xs"
          onClick={() => {
            onAdd(draft);
            setDraft({ role: "ESTIMATOR", label: "", scope: "" });
          }}
        >
          Add role
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-[var(--muted)]">{label}</span>
      <div className="[&_input]:w-full [&_input]:rounded-lg [&_input]:border [&_input]:border-[var(--line)] [&_input]:bg-[var(--panel-2)] [&_input]:px-3 [&_input]:py-2 [&_select]:w-full [&_select]:rounded-lg [&_select]:border [&_select]:border-[var(--line)] [&_select]:bg-[var(--panel-2)] [&_select]:px-3 [&_select]:py-2">
        {children}
      </div>
    </label>
  );
}
