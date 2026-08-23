"use client";

import { Fragment, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FEATURES,
  GOVERNANCE_RULES,
  ROLES,
  type Access,
  type AppRole,
  type FeatureId,
  type RbacMatrix,
} from "@/lib/rbac";
import { ROLE_LABELS } from "@/lib/roles";

function cellClass(access: Access) {
  if (access === "RW") return "bg-emerald-50 text-emerald-800";
  if (access === "R") return "bg-sky-50 text-sky-800";
  return "bg-[var(--panel-2)] text-[var(--muted)]";
}

export function RbacEditor({
  initial,
  canEdit,
}: {
  initial: RbacMatrix;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [matrix, setMatrix] = useState<RbacMatrix>(initial);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const groups = [...new Set(FEATURES.map((f) => f.group))];

  function setCell(feature: FeatureId, role: AppRole, value: Access) {
    setMatrix((current) => ({
      ...current,
      [feature]: { ...current[feature], [role]: value },
    }));
  }

  async function save() {
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/rbac", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matrix }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      setMatrix(data.matrix);
      setMessage("RBAC saved. Menus and APIs now use this matrix.");
      router.refresh();
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function reset() {
    if (!window.confirm("Reset every cell to the shipped PDF defaults?")) return;
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/rbac", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reset: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Reset failed");
      setMatrix(data.matrix);
      setMessage("Restored PDF defaults.");
      router.refresh();
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="kicker">Access</p>
          <h1 className="font-display text-2xl font-semibold text-[var(--navy)]">RBAC matrix</h1>
          <p className="mt-1 max-w-3xl text-sm text-[var(--muted)]">
            Configurable source of truth for menus, APIs, and record scope.{" "}
            <strong>RW</strong> is read-write, <strong>R</strong> is read only, blank is no access.
            Under <em>Record scope</em>, grant <strong>All teams</strong> for cross-team visibility and{" "}
            <strong>Write any on team</strong> to edit teammates&apos; estimates (blank = own records
            only). Function grants still required. Admin must keep RW on this page, login credentials,
            and All teams scope.
          </p>
        </div>
        {canEdit ? (
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-ghost" onClick={reset} disabled={busy}>
              Reset to defaults
            </button>
            <button type="button" className="btn-primary" onClick={save} disabled={busy}>
              Save RBAC
            </button>
          </div>
        ) : (
          <p className="text-sm text-[var(--muted)]">Read only for this profile.</p>
        )}
      </div>
      {message ? <p className="text-sm text-[var(--ok)]">{message}</p> : null}
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead className="bg-[var(--panel-2)] text-[var(--muted)]">
            <tr>
              <th className="px-3 py-2">Function</th>
              {ROLES.map((role) => (
                <th key={role} className="px-2 py-2 text-center">
                  {ROLE_LABELS[role]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => (
              <Fragment key={group}>
                <tr className="border-t border-[var(--line)] bg-[var(--bg)]">
                  <td className="px-3 py-2 text-xs font-semibold uppercase tracking-wide" colSpan={ROLES.length + 1}>
                    {group}
                  </td>
                </tr>
                {FEATURES.filter((f) => f.group === group).map((feature) => (
                  <tr key={feature.id} className="border-t border-[var(--line)]">
                    <td className="px-3 py-2">{feature.label}</td>
                    {ROLES.map((role) => {
                      const value = matrix[feature.id][role];
                      return (
                        <td key={role} className={`px-1 py-1 text-center ${cellClass(value)}`}>
                          {canEdit ? (
                            <select
                              className={`w-full rounded border border-[var(--line)] bg-transparent px-1 py-1 text-center text-xs font-semibold ${cellClass(value)}`}
                              value={value ?? ""}
                              disabled={
                                role === "ADMINISTRATOR" &&
                                (feature.id === "config.rbac" || feature.id === "config.users")
                              }
                              onChange={(e) =>
                                setCell(feature.id, role, (e.target.value || null) as Access)
                              }
                            >
                              <option value="">—</option>
                              <option value="R">R</option>
                              <option value="RW">RW</option>
                            </select>
                          ) : (
                            <span className="text-xs font-semibold">{value ?? ""}</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      <section className="card space-y-2 p-5">
        <h2 className="font-medium text-[var(--navy)]">Governance rules (also enforced in APIs)</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-[var(--muted)]">
          {GOVERNANCE_RULES.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
