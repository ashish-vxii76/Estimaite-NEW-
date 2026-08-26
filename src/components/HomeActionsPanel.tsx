import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { HomeAction } from "@/lib/homeInbox";

export function HomeActionsPanel({ actions }: { actions: HomeAction[] }) {
  if (!actions.length) return null;
  return (
    <section className="card space-y-4 p-5">
      <div>
        <p className="kicker">Actions</p>
        <h2 className="font-display text-lg font-semibold text-[var(--navy)]">App shortcuts</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Shortcuts for this profile. Visibility follows Access → RBAC (`home.actions` plus each
          destination feature).
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {actions.map((action) => (
          <Link
            key={action.id}
            href={action.href}
            className="card-interactive group flex items-start justify-between gap-3 rounded-xl border border-[var(--line)] bg-[var(--panel-2)] px-4 py-3"
          >
            <span>
              <p className="font-medium text-[var(--navy)]">{action.label}</p>
              <p className="mt-1 text-xs text-[var(--muted)]">{action.description}</p>
            </span>
            <ArrowUpRight
              size={16}
              className="mt-0.5 shrink-0 text-[var(--muted)] transition-colors group-hover:text-[var(--gold-2)]"
            />
          </Link>
        ))}
      </div>
    </section>
  );
}
