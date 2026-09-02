"use client";

import { useState, useTransition } from "react";
import { switchRole } from "@/actions/switchRole";

export type RoleOption = {
  id: string;
  /** Display title, e.g. "Deputy Crew Tech Lead". */
  label: string;
  /** Pod or org-unit name this role is scoped to. */
  scopeName: string | null;
  isActive: boolean;
};

export function RoleSwitcher({ options }: { options: RoleOption[] }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  // Only users who actually hold more than one role get a switcher.
  if (options.length < 2) return null;

  const activeId = options.find((o) => o.isActive)?.id ?? options[0].id;

  function onChange(id: string) {
    if (!id || id === activeId) return;
    setError("");
    startTransition(async () => {
      try {
        await switchRole(id);
      } catch (e) {
        // A successful switch redirects, which Next signals by throwing a
        // NEXT_REDIRECT control-flow error. Re-throw it so the framework
        // performs the navigation instead of surfacing it as an error.
        const digest = (e as { digest?: string })?.digest;
        if (typeof digest === "string" && digest.startsWith("NEXT_REDIRECT")) throw e;
        setError((e as Error).message);
      }
    });
  }

  return (
    <div className="mt-3 space-y-1">
      <label className="block text-[10px] uppercase tracking-wide text-[var(--muted)]">
        Switch role
      </label>
      <select
        className="w-full rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-2 py-1.5 text-xs text-[var(--text)]"
        value={activeId}
        disabled={pending}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
            {o.scopeName ? ` · ${o.scopeName}` : ""}
          </option>
        ))}
      </select>
      <p className="text-[10px] text-[var(--muted)]">
        Only your granted roles — activates instantly, no password.
      </p>
      {error ? <p className="text-[10px] text-[var(--danger)]">{error}</p> : null}
    </div>
  );
}
