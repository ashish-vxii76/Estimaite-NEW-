import { Fragment } from "react";
import { FEATURES, GOVERNANCE_RULES, RBAC, type Access } from "@/lib/rbac";
import { ROLES, ROLE_LABELS } from "@/lib/roles";

function cell(access: Access) {
  if (access === "RW") return { label: "RW", className: "bg-emerald-50 text-emerald-800" };
  if (access === "R") return { label: "R", className: "bg-sky-50 text-sky-800" };
  return { label: "", className: "bg-[var(--panel-2)] text-[var(--muted)]" };
}

export default function RbacPage() {
  const groups = [...new Set(FEATURES.map((f) => f.group))];
  return (
    <div className="space-y-6">
      <div>
        <p className="kicker">Access</p>
        <h1 className="font-display text-2xl font-semibold text-[var(--navy)]">RBAC matrix</h1>
        <p className="mt-1 max-w-3xl text-sm text-[var(--muted)]">
          Source of truth for menus and APIs. <strong>RW</strong> is read-write, <strong>R</strong> is
          read only, blank is no access. Non-admin profiles only see their assigned team — a Vikings
          Approver sees Vikings estimates, portfolio and What-If as Approver. Admin sees every team.
        </p>
      </div>
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
                      const display = cell(RBAC[feature.id][role]);
                      return (
                        <td key={role} className={`px-2 py-2 text-center text-xs font-semibold ${display.className}`}>
                          {display.label}
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
