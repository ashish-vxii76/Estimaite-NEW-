"use client";

import { useState } from "react";
import { ROLES, roleLabel } from "@/lib/roles";

type UserRow = {
  id: string;
  email: string;
  name: string;
  role: string;
  active: boolean;
};

export function UsersAdmin({ initial }: { initial: UserRow[] }) {
  const [rows, setRows] = useState(initial);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "demo1234",
    role: "REQUESTER",
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
    setForm({ name: "", email: "", password: "demo1234", role: "REQUESTER" });
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

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Login credentials</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Each login is a profile. Role decides which menus, creates, reviews and admin tables they
          can use.
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
        <div className="md:col-span-2">
          <button className="rounded-lg bg-teal-400 px-4 py-2 text-slate-950" onClick={createUser}>
            Create login
          </button>
        </div>
      </section>

      {message ? <p className="text-sm text-teal-200">{message}</p> : null}

      <section className="card overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-[var(--panel-2)] text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Active</th>
              <th>Reset password</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-[var(--line)]">
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
                  <button
                    className="text-xs text-teal-300 underline"
                    onClick={() => updateUser(row.id, { active: !row.active })}
                  >
                    {row.active ? "Active" : "Disabled"}
                  </button>
                </td>
                <td>
                  <button
                    className="text-xs text-teal-300 underline"
                    onClick={() => {
                      const password = window.prompt("New password (min 8 characters)", "demo1234");
                      if (password) updateUser(row.id, { password });
                    }}
                  >
                    Set password
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
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
