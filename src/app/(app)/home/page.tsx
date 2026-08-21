import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { HomeCharts } from "@/components/HomeCharts";
import { can } from "@/lib/access";
import { estimateScope, fromSession } from "@/lib/scope";
import { welcomeLine } from "@/lib/roles";
import { getActiveConfig } from "@/services/configService";

function nextAction(
  role: string | undefined,
  drafts: number,
  pendingReview: number,
  pendingApprove: number,
  discovery: number,
) {
  if (role === "APPROVER") {
    return pendingApprove > 0
      ? { href: "/estimates?status=REVIEWED", label: "Approve waiting estimates" }
      : { href: "/estimates", label: "Open the register" };
  }
  if (role === "REVIEWER") {
    return pendingReview > 0
      ? { href: "/estimates?status=READY_FOR_REVIEW", label: "Review waiting estimates" }
      : { href: "/estimates", label: "Open the register" };
  }
  if (can(role, "estimates.create", "RW") && discovery > 0) {
    return { href: "/estimates?status=DRAFT", label: "Open discovery queue" };
  }
  if (can(role, "config.users") || can(role, "config.mappings", "RW")) {
    return { href: "/admin", label: "Open mapping studio" };
  }
  if (can(role, "estimates.create", "RW") && drafts > 0) {
    return { href: "/estimates?status=DRAFT", label: "Continue drafts" };
  }
  if (can(role, "estimates.create", "RW")) {
    return { href: "/estimates/new", label: "Start the next estimate" };
  }
  if (pendingReview + pendingApprove > 0) {
    return { href: "/estimates?status=READY_FOR_REVIEW", label: "See items in review" };
  }
  return { href: "/estimates", label: "Open the register" };
}

export default async function HomePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const scope = estimateScope(fromSession(session.user));
  const [
    total,
    drafts,
    pendingReview,
    pendingApprove,
    approved,
    completed,
    byTeamRows,
    byStatusRows,
    resultRows,
    team,
    config,
    releaseRows,
  ] = await Promise.all([
    prisma.estimate.count({ where: scope }),
    prisma.estimate.count({ where: { ...scope, status: { in: ["DRAFT", "RETURNED"] } } }),
    prisma.estimate.count({ where: { ...scope, status: "READY_FOR_REVIEW" } }),
    prisma.estimate.count({ where: { ...scope, status: "REVIEWED" } }),
    prisma.estimate.count({ where: { ...scope, status: "APPROVED" } }),
    prisma.estimate.count({ where: { ...scope, status: "COMPLETED" } }),
    prisma.estimate.groupBy({
      by: ["teamId"],
      where: scope,
      _count: { _all: true },
    }),
    prisma.estimate.groupBy({
      by: ["status"],
      where: scope,
      _count: { _all: true },
    }),
    prisma.estimate.findMany({ where: scope, select: { resultJson: true } }),
    session.user.teamId
      ? prisma.team.findUnique({ where: { id: session.user.teamId }, select: { name: true } })
      : Promise.resolve(null),
    getActiveConfig(),
    prisma.estimate.groupBy({
      by: ["release"],
      where: scope,
      _count: { _all: true },
    }),
  ]);

  const discovery = resultRows.filter((row) => {
    if (!row.resultJson) return false;
    try {
      const parsed = JSON.parse(row.resultJson) as {
        deliveryFlag?: string;
        governanceDecision?: string;
        dorStatus?: string;
      };
      return (
        parsed.deliveryFlag === "DISCOVERY REQUIRED" ||
        parsed.governanceDecision === "DISCOVERY REQUIRED" ||
        parsed.dorStatus === "Discovery Required"
      );
    } catch {
      return false;
    }
  }).length;

  const teams = await prisma.team.findMany({
    where: session.user.role === "ADMINISTRATOR" ? undefined : session.user.teamId ? { id: session.user.teamId } : { id: "__none__" },
    select: { id: true, name: true },
  });
  const teamNames = Object.fromEntries(teams.map((t) => [t.id, t.name]));
  const byTeam = byTeamRows.map((row) => ({
    name: teamNames[row.teamId] ?? "Unknown",
    count: row._count._all,
  }));
  const statusLabels: Record<string, string> = {
    DRAFT: "Draft",
    RETURNED: "Returned",
    READY_FOR_REVIEW: "Ready for review",
    REVIEWED: "Reviewed",
    APPROVED: "Approved",
    REJECTED: "Rejected",
    COMPLETED: "Completed",
  };
  const byStatus = byStatusRows.map((row) => ({
    name: statusLabels[row.status] ?? row.status,
    count: row._count._all,
  }));

  const releaseCounts = Object.fromEntries(
    releaseRows.map((row) => [row.release ?? "", row._count._all]),
  );
  const quarters = config.releaseQuarters ?? [];

  const action = nextAction(session.user.role, drafts, pendingReview, pendingApprove, discovery);
  const teamName = session.user.role === "ADMINISTRATOR" ? "All teams" : team?.name;
  const situation =
    total === 0
      ? "No estimates in this scope yet. The next action is to size the first work item."
      : discovery > 0
        ? `${discovery} of ${total} estimates are stamped DISCOVERY REQUIRED. Size those first.`
        : pendingReview + pendingApprove > 0
          ? `${pendingReview + pendingApprove} estimates are waiting in review. ${total} sit in the register.`
          : `${total} estimates in the register. Nothing is waiting on discovery.`;

  return (
    <div className="space-y-6">
      <div>
        <p className="kicker">Home</p>
        <h1 className="font-display text-2xl font-semibold text-[var(--navy)]">
          {welcomeLine(session.user.name, session.user.role, teamName)}
        </h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Signed in as {session.user.email}. Menus, numbers and actions follow this profile
          {teamName ? ` for ${teamName}` : ""}.
        </p>
      </div>
      <div className="situation flex flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm">
        <p>{situation}</p>
        <Link href={action.href} className="btn-primary shrink-0">
          {action.label}
        </Link>
      </div>
      <div className="grid gap-4 md:grid-cols-5">
        <Tile label="Estimates" value={total} />
        <Tile label="Drafts" value={drafts} />
        <Tile label="In review" value={pendingReview + pendingApprove} />
        <Tile label="Approved" value={approved} />
        <Tile label="Completed" value={completed} />
      </div>
      {quarters.length ? (
        <section className="card space-y-3 p-5">
          <div>
            <h2 className="font-medium text-[var(--navy)]">Release quarters</h2>
            <p className="text-sm text-[var(--muted)]">
              Jump to the register filtered by quarter. Counts include items in your scope.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {quarters.map((q) => (
              <Link
                key={q}
                href={`/estimates?release=${encodeURIComponent(q)}`}
                className="rounded-full border border-[var(--line)] bg-[var(--panel-2)] px-3 py-1.5 text-sm text-[var(--navy)] hover:border-[var(--navy)]"
              >
                {q}
                <span className="ml-2 text-[var(--muted)]">{releaseCounts[q] ?? 0}</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
      <HomeCharts byStatus={byStatus} byTeam={byTeam} />
    </div>
  );
}

function Tile({ label, value }: { label: string; value: number }) {
  return (
    <div className="card p-4">
      <p className="text-xs uppercase tracking-wide text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-[var(--navy)]">{value}</p>
    </div>
  );
}
