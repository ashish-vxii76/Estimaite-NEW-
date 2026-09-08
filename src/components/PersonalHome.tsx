import Link from "next/link";

/**
 * Role-adaptive "personal" Home for individual-contributor roles whose scope is too narrow for the
 * aggregate leadership dashboard (Estimator/Requester, Reviewer, Approver, Viewer, Pod-level
 * Delivery Lead). It shows the SHAPE of work that role actually does — a work/queue list, a compact
 * scoped stat strip, recent activity and quick actions — and always has a graceful empty state so
 * the page never reads as dead. The aggregate dashboard is untouched and still serves leadership.
 */

export type PersonaKind = "maker" | "contributor" | "reviewer" | "approver" | "viewer";

export type HomeItem = {
  id: string;
  reference: string;
  title: string;
  status: string;
  team: string;
  ageDays: number;
  flag: string;
};

export type HomeStat = { label: string; value: number; tone?: "warn" | "ok" };

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draft",
  RETURNED: "Returned",
  READY_FOR_REVIEW: "Ready for review",
  REVIEWED: "Awaiting approval",
  APPROVED: "Approved",
  COMPLETED: "Completed",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
};

// Chip class per status (theme-aware tokens from globals.css).
const STATUS_CHIP: Record<string, string> = {
  DRAFT: "chip-neutral",
  RETURNED: "chip-bad",
  READY_FOR_REVIEW: "chip-warn",
  REVIEWED: "chip-warn",
  APPROVED: "chip-ok",
  COMPLETED: "chip-ok",
  REJECTED: "chip-bad",
  CANCELLED: "chip-neutral",
};

function Rule() {
  return <hr className="mb-3 h-0.5 w-8 rounded-full border-0 bg-[linear-gradient(90deg,var(--gold-2),var(--gold))]" />;
}

function ageLabel(days: number): string {
  if (days <= 0) return "today";
  if (days === 1) return "1 day";
  return `${days} days`;
}

function ItemRow({ item, showAge }: { item: HomeItem; showAge?: boolean }) {
  return (
    <Link
      href={`/estimates/${item.id}`}
      className="flex items-center gap-3 border-t border-[var(--line)] py-2.5 text-sm first:border-0 hover:bg-[var(--panel-2)]"
    >
      <span className={`${STATUS_CHIP[item.status] ?? "chip-neutral"} shrink-0 rounded-full px-2 py-0.5 text-[0.62rem] font-bold`}>
        {STATUS_LABEL[item.status] ?? item.status}
      </span>
      <span className="font-semibold text-[var(--navy)]">{item.reference}</span>
      <span className="min-w-0 flex-1 truncate text-[var(--muted)]" title={item.title}>
        {item.title}
      </span>
      {item.flag ? (
        <span className="chip-bad shrink-0 rounded-full px-2 py-0.5 text-[0.6rem] font-bold">{item.flag}</span>
      ) : null}
      {showAge ? (
        <span className="shrink-0 tabular-nums text-xs text-[var(--muted)]">{ageLabel(item.ageDays)}</span>
      ) : null}
    </Link>
  );
}

export function PersonalHome({
  persona,
  primary,
  stats,
  recent,
  submissions,
  canCreate,
  showAge,
}: {
  persona: PersonaKind;
  primary: { title: string; sub: string; empty: string; items: HomeItem[]; more: number; moreHref: string };
  stats: HomeStat[];
  recent: HomeItem[];
  /** Contributor personas (Delivery Lead / Requester) get their own "Raised by you" card instead of
   * generic recent activity — their primary list is the pod's work, not their authored records. */
  submissions?: { items: HomeItem[]; empty: string };
  canCreate: boolean;
  /** Queue personas (reviewer/approver) show how long each item has been waiting. */
  showAge?: boolean;
}) {
  const showRecent = !submissions && persona !== "viewer" && recent.length > 0;

  return (
    <div className="space-y-4">
      {/* Compact scoped stat strip */}
      {stats.length > 0 ? (
        <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
          {stats.map((s) => (
            <div key={s.label} className="rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-3 py-2.5">
              <p className="truncate text-[0.62rem] font-semibold uppercase tracking-[0.1em] text-[var(--muted)]" title={s.label}>
                {s.label}
              </p>
              <p
                className="mt-0.5 text-2xl font-semibold tabular-nums"
                style={{ color: s.tone === "warn" ? "var(--danger)" : s.tone === "ok" ? "var(--ok)" : "var(--navy)" }}
              >
                {s.value}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        {/* Primary work / queue list */}
        <section className="card flex flex-col p-5">
          <div>
            <Rule />
            <h3 className="font-display text-base font-semibold text-[var(--navy)]">{primary.title}</h3>
            <p className="text-xs text-[var(--muted)]">{primary.sub}</p>
          </div>

          <div className="mt-3 flex flex-col">
            {primary.items.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-12 text-center">
                <p className="text-sm text-[var(--muted)]">{primary.empty}</p>
                {canCreate ? (
                  <Link
                    href="/estimates/new"
                    className="inline-flex items-center gap-1 text-sm font-medium text-[var(--navy)] underline underline-offset-4 hover:text-[var(--gold)]"
                  >
                    Start a new estimate <span aria-hidden>→</span>
                  </Link>
                ) : null}
              </div>
            ) : (
              <>
                {primary.items.map((item) => (
                  <ItemRow key={item.id} item={item} showAge={showAge} />
                ))}
                {primary.more > 0 ? (
                  <Link
                    href={primary.moreHref}
                    className="mt-2 self-start text-sm font-medium text-[var(--navy)] underline"
                  >
                    View all {primary.more + primary.items.length} →
                  </Link>
                ) : null}
              </>
            )}
          </div>
        </section>

        {/* Quick actions + recent */}
        <div className="flex flex-col gap-4">
          <section className="card flex flex-col p-5">
            <Rule />
            <h3 className="font-display text-base font-semibold text-[var(--navy)]">Quick actions</h3>
            <div className="mt-3 flex flex-col gap-2">
              {canCreate ? (
                <Link href="/estimates/new" className="btn-gold justify-start text-sm">
                  + New estimate
                </Link>
              ) : null}
              <Link href="/estimates" className="btn-ghost text-sm">
                Open the register →
              </Link>
            </div>
          </section>

          {submissions ? (
            <section className="card flex flex-col p-5">
              <Rule />
              <h3 className="font-display text-base font-semibold text-[var(--navy)]">Raised by you</h3>
              <p className="text-xs text-[var(--muted)]">Estimates you created</p>
              <div className="mt-2 flex flex-col">
                {submissions.items.length === 0 ? (
                  <p className="py-6 text-center text-sm text-[var(--muted)]">{submissions.empty}</p>
                ) : (
                  submissions.items.map((item) => <ItemRow key={item.id} item={item} />)
                )}
              </div>
            </section>
          ) : showRecent ? (
            <section className="card flex flex-col p-5">
              <Rule />
              <h3 className="font-display text-base font-semibold text-[var(--navy)]">Recent activity</h3>
              <p className="text-xs text-[var(--muted)]">Latest estimates in your scope</p>
              <div className="mt-2 flex flex-col">
                {recent.map((item) => (
                  <ItemRow key={item.id} item={item} />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
