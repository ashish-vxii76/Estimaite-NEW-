import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { HomeCharts } from "@/components/HomeCharts";
import {
  ESTIMATE_CREATE_ROLES,
  hasRole,
  welcomeLine,
} from "@/lib/roles";

function nextAction(role: string | undefined, drafts: number, pending: number, discovery: number) {
  if (hasRole(role, ESTIMATE_CREATE_ROLES) && discovery > 0) {
    return { href: "/estimates?status=DRAFT", label: "Open discovery queue" };
  }
  if (role === "REVIEWER" || role === "APPROVER") {
    return { href: "/estimates?status=READY_FOR_REVIEW", label: "Review waiting estimates" };
  }
  if (role === "ADMINISTRATOR" || role === "FINANCE") {
    return { href: "/admin", label: "Open mapping studio" };
  }
  if (hasRole(role, ESTIMATE_CREATE_ROLES) && drafts > 0) {
    return { href: "/estimates?status=DRAFT", label: "Continue drafts" };
  }
  if (hasRole(role, ESTIMATE_CREATE_ROLES)) {
    return { href: "/estimates/new", label: "Start the next estimate" };
  }
  if (pending > 0) {
    return { href: "/estimates?status=READY_FOR_REVIEW", label: "See items in review" };
  }
  return { href: "/estimates", label: "Open the register" };
}

export default async function HomePage() {
  const session = await auth();
  const [total, drafts, pending, approved, completed, byTeamRows, byStatusRows, resultRows] =
    await Promise.all([
      prisma.estimate.count(),
      prisma.estimate.count({ where: { status: { in: ["DRAFT", "RETURNED"] } } }),
      prisma.estimate.count({ where: { status: { in: ["READY_FOR_REVIEW", "REVIEWED"] } } }),
      prisma.estimate.count({ where: { status: "APPROVED" } }),
      prisma.estimate.count({ where: { status: "COMPLETED" } }),
      prisma.estimate.groupBy({
        by: ["teamId"],
        _count: { _all: true },
      }),
      prisma.estimate.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),
      prisma.estimate.findMany({ select: { resultJson: true } }),
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

  const teams = await prisma.team.findMany({ select: { id: true, name: true } });
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

  const action = nextAction(session?.user.role, drafts, pending, discovery);
  const situation =
    total === 0
      ? "No estimates in the register yet. The next action is to size the first work item."
      : discovery > 0
        ? `${discovery} of ${total} estimates are stamped DISCOVERY REQUIRED. Size those first.`
        : pending > 0
          ? `${pending} estimates are waiting in review. ${total} sit in the register.`
          : `${total} estimates in the register. Nothing is waiting on discovery.`;

  return (
    <div className="space-y-6">
      <div>
        <p className="kicker">Home</p>
        <h1 className="font-display text-2xl font-semibold text-[var(--navy)]">
          {welcomeLine(session?.user.name, session?.user.role)}
        </h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Signed in as {session?.user.email}. Menus and actions follow this profile.
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
        <Tile label="In review" value={pending} />
        <Tile label="Approved" value={approved} />
        <Tile label="Completed" value={completed} />
      </div>
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
