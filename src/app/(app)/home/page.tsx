import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { HomeCharts } from "@/components/HomeCharts";
import { HomeFilters } from "@/components/HomeFilters";
import { HomeActionsPanel } from "@/components/HomeActionsPanel";
import { can } from "@/lib/access";
import { fromSession, resolveEstimateScope, teamsForUser } from "@/lib/scope";
import { welcomeLine } from "@/lib/roles";
import { getActiveConfig } from "@/services/configService";
import { buildHomeActions } from "@/lib/homeInbox";
import { releaseWhere } from "@/lib/releasePeriod";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{
    team?: string;
    workItemType?: string;
    release?: string;
    crew?: string;
  }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!can(session.user.role, "home")) redirect("/estimates");

  const {
    team: teamFilter = "",
    workItemType = "",
    release = "",
    crew: crewFilter = "",
  } = await searchParams;
  const scope = await resolveEstimateScope(fromSession(session.user));
  const filter = {
    ...scope,
    ...(teamFilter ? { teamId: teamFilter } : {}),
    ...(crewFilter && !teamFilter ? { team: { crewId: crewFilter } } : {}),
    ...(workItemType ? { workItemType } : {}),
    ...releaseWhere(release),
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
    orgUnits,
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
    teamsForUser(fromSession(session.user)),
    prisma.orgUnit.findMany({
      where: { active: true },
      select: { id: true, name: true, type: true, parentId: true },
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

  const filteredTeams = crewFilter
    ? teams.filter((t) => t.crewId === crewFilter)
    : teams;

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
        teams={filteredTeams.map((t) => ({ value: t.id, label: t.name }))}
        quarters={quarters}
        orgUnits={orgUnits}
        team={teamFilter}
        workItemType={workItemType}
        release={release}
        crew={crewFilter}
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
    <div className="card card-interactive overflow-hidden p-4">
      <span className="mb-3 block h-0.5 w-8 rounded-full bg-[linear-gradient(90deg,var(--gold-2),var(--gold))]" />
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-3xl font-semibold tabular-nums text-[var(--navy)]">{value}</p>
    </div>
  );
}
