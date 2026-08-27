import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { HomeCharts } from "@/components/HomeCharts";
import { HomeFilters } from "@/components/HomeFilters";
import { HomeActionsPanel } from "@/components/HomeActionsPanel";
import { can, seesAllTeams } from "@/lib/access";
import { fromSession, resolveEstimateScope, teamsForUser } from "@/lib/scope";
import { welcomeLine } from "@/lib/roles";
import { getActiveConfig } from "@/services/configService";
import { buildHomeActions } from "@/lib/homeInbox";
import { releaseWhere } from "@/lib/releasePeriod";
import { lockedOrgPathForUser } from "@/lib/lockedOrgPath";
import {
  estimateWhereForOrgCascade,
  lockIdsFromPath,
  teamsMatchingCascade,
} from "@/lib/orgCascade";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{
    team?: string;
    workItemType?: string;
    release?: string;
    company?: string;
    division?: string;
    subDivision?: string;
    stream?: string;
    crew?: string;
  }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!can(session.user.role, "home")) redirect("/estimates");

  const params = await searchParams;
  const {
    team: teamParam = "",
    workItemType = "",
    release = "",
    company: companyParam = "",
    division: divisionParam = "",
    subDivision: subParam = "",
    stream: streamParam = "",
    crew: crewParam = "",
  } = params;

  const orgEditable = seesAllTeams(session.user.role);
  const lockedPath = await lockedOrgPathForUser(session.user.id);
  const scope = await resolveEstimateScope(fromSession(session.user));

  const [
    config,
    teams,
    orgUnits,
    team,
  ] = await Promise.all([
    getActiveConfig(),
    teamsForUser(fromSession(session.user)),
    prisma.orgUnit.findMany({
      where: { active: true },
      select: { id: true, name: true, type: true, parentId: true },
      orderBy: { name: "asc" },
    }),
    session.user.teamId
      ? prisma.team.findUnique({ where: { id: session.user.teamId }, select: { name: true } })
      : Promise.resolve(null),
  ]);

  const lockIds = lockIdsFromPath(orgUnits, lockedPath);
  const company = orgEditable ? companyParam : lockIds.companyId;
  const division = orgEditable ? divisionParam : lockIds.divisionId;
  const subDivision = orgEditable ? subParam : lockIds.subDivisionId;
  const stream = orgEditable ? streamParam : lockIds.streamId;
  const crew = orgEditable ? crewParam : lockIds.crewId || crewParam;
  const teamFilter = teamParam;

  const cascade = { company, division, subDivision, stream, crew, team: teamFilter };
  const orgWhere = estimateWhereForOrgCascade(orgUnits, cascade);
  const filter = {
    ...scope,
    ...orgWhere,
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
  ]);

  const podOptions = teamsMatchingCascade(orgUnits, teams, {
    company,
    division,
    subDivision,
    stream,
    crew,
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

  const quarters = config.releaseQuarters ?? [];
  const teamName = orgEditable ? "All teams" : team?.name;
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
          Signed in as {session.user.email}. Organisation filters
          {orgEditable
            ? " are fully editable for app admin"
            : " follow your org seat (read-only path; Pod open)"}
          .
        </p>
      </div>

      <HomeFilters
        quarters={quarters}
        orgUnits={orgUnits}
        teams={podOptions.map((t) => ({ id: t.id, name: t.name, crewId: t.crewId }))}
        orgEditable={orgEditable}
        lockedPath={lockedPath}
        company={company}
        division={division}
        subDivision={subDivision}
        stream={stream}
        crew={crew}
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
