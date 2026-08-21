import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { HomeCharts } from "@/components/HomeCharts";
import { HomeFilters } from "@/components/HomeFilters";
import { HomeActionsPanel } from "@/components/HomeActionsPanel";
import { can } from "@/lib/access";
import { estimateScope, fromSession } from "@/lib/scope";
import { welcomeLine } from "@/lib/roles";
import { getActiveConfig } from "@/services/configService";
import { buildHomeActions } from "@/lib/homeInbox";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ team?: string; workItemType?: string; release?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!can(session.user.role, "home")) redirect("/estimates");

  const { team: teamFilter = "", workItemType = "", release = "" } = await searchParams;
  const scope = estimateScope(fromSession(session.user));
  const filter = {
    ...scope,
    ...(teamFilter ? { teamId: teamFilter } : {}),
    ...(workItemType ? { workItemType } : {}),
    ...(release ? { release } : {}),
  };

  const [
    total,
    drafts,
    pendingReview,
    pendingApprove,
    approved,
    completed,
    byTeamRows,
    byStatusRows,
    team,
    config,
    teams,
  ] = await Promise.all([
    prisma.estimate.count({ where: filter }),
    prisma.estimate.count({ where: { ...filter, status: { in: ["DRAFT", "RETURNED"] } } }),
    prisma.estimate.count({ where: { ...filter, status: "READY_FOR_REVIEW" } }),
    prisma.estimate.count({ where: { ...filter, status: "REVIEWED" } }),
    prisma.estimate.count({ where: { ...filter, status: "APPROVED" } }),
    prisma.estimate.count({ where: { ...filter, status: "COMPLETED" } }),
    prisma.estimate.groupBy({
      by: ["teamId"],
      where: filter,
      _count: { _all: true },
    }),
    prisma.estimate.groupBy({
      by: ["status"],
      where: filter,
      _count: { _all: true },
    }),
    session.user.teamId
      ? prisma.team.findUnique({ where: { id: session.user.teamId }, select: { name: true } })
      : Promise.resolve(null),
    getActiveConfig(),
    prisma.team.findMany({
      where:
        session.user.role === "ADMINISTRATOR"
          ? undefined
          : session.user.teamId
            ? { id: session.user.teamId }
            : { id: "__none__" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

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

  const quarters = config.releaseQuarters ?? [];
  const teamName = session.user.role === "ADMINISTRATOR" ? "All teams" : team?.name;
  const showActions = can(session.user.role, "home.actions");
  const actions = showActions ? buildHomeActions(session.user.role) : [];

  return (
    <div className="space-y-6">
      <div>
        <p className="kicker">Home</p>
        <h1 className="font-display text-2xl font-semibold text-[var(--navy)]">
          {welcomeLine(session.user.name, session.user.role, teamName)}
        </h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Signed in as {session.user.email}. Menus, numbers and actions follow this profile
          {teamName ? ` for ${teamName}` : ""}. Alerts appear in the bell (top right) when granted
          in Access → RBAC.
        </p>
      </div>

      <HomeFilters
        teams={teams.map((t) => ({ value: t.id, label: t.name }))}
        quarters={quarters}
        team={teamFilter}
        workItemType={workItemType}
        release={release}
      />

      <div className="grid gap-4 md:grid-cols-5">
        <Tile label="Estimates" value={total} />
        <Tile label="Drafts" value={drafts} />
        <Tile label="In review" value={pendingReview + pendingApprove} />
        <Tile label="Approved" value={approved} />
        <Tile label="Completed" value={completed} />
      </div>
      <HomeCharts byStatus={byStatus} byTeam={byTeam} />
      {showActions ? <HomeActionsPanel actions={actions} /> : null}
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
