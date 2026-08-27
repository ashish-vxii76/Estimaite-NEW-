import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { HomeDashboard } from "@/components/HomeDashboard";
import { OrgScopeFilters } from "@/components/OrgScopeFilters";
import { HomeActionsPanel } from "@/components/HomeActionsPanel";
import { can } from "@/lib/access";
import { fromSession, teamsForUser } from "@/lib/scope";
import { getOrgFilterData, resolveOrgSelectionWhere } from "@/lib/orgFilter";
import { welcomeLine } from "@/lib/roles";
import { getActiveConfig } from "@/services/configService";
import { getPortfolio } from "@/services/portfolioService";
import { buildHomeActions } from "@/lib/homeInbox";
import { releaseWhere } from "@/lib/releasePeriod";

const ACTION_FLAGS = ["SPLIT", "SPLIT EPIC", "SPIKE REQUIRED", "DISCOVERY REQUIRED", "DECOMPOSE"];

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ team?: string; workItemType?: string; release?: string; org?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!can(session.user.role, "home")) redirect("/estimates");

  const { team: teamFilter = "", workItemType = "", release = "", org = "" } = await searchParams;
  const scopeUser = fromSession(session.user);
  const orgWhere = await resolveOrgSelectionWhere(scopeUser, org, teamFilter);
  const filter = {
    ...orgWhere,
    ...(workItemType ? { workItemType } : {}),
    ...releaseWhere(release),
  };

  const [
    total, drafts, pendingReview, pendingApprove, approved, completed,
    byTeamRows, byStatusRows, byFlagRows, byConfidenceRows, readinessAgg,
    activityRows, attentionRows, team, config, teams, orgFilter, portfolio,
  ] = await Promise.all([
    prisma.estimate.count({ where: filter }),
    prisma.estimate.count({ where: { ...filter, status: { in: ["DRAFT", "RETURNED"] } } }),
    prisma.estimate.count({ where: { ...filter, status: "READY_FOR_REVIEW" } }),
    prisma.estimate.count({ where: { ...filter, status: "REVIEWED" } }),
    prisma.estimate.count({ where: { ...filter, status: "APPROVED" } }),
    prisma.estimate.count({ where: { ...filter, status: "COMPLETED" } }),
    prisma.estimate.groupBy({ by: ["teamId"], where: filter, _count: { _all: true } }),
    prisma.estimate.groupBy({ by: ["status"], where: filter, _count: { _all: true } }),
    prisma.estimate.groupBy({ by: ["deliveryFlag"], where: { ...filter, deliveryFlag: { not: "" } }, _count: { _all: true } }),
    prisma.estimate.groupBy({ by: ["confidence"], where: { ...filter, confidence: { not: "" } }, _count: { _all: true } }),
    prisma.estimate.aggregate({ where: { ...filter, readinessScore: { gt: 0 } }, _avg: { readinessScore: true } }),
    prisma.estimate.findMany({ where: filter, select: { createdAt: true, status: true } }),
    prisma.estimate.findMany({
      where: { ...filter, OR: [{ deliveryFlag: { in: ACTION_FLAGS } }, { status: { in: ["RETURNED", "REJECTED"] } }] },
      select: { id: true, reference: true, title: true, deliveryFlag: true, status: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 6,
    }),
    session.user.teamId
      ? prisma.team.findUnique({ where: { id: session.user.teamId }, select: { name: true } })
      : Promise.resolve(null),
    getActiveConfig(),
    teamsForUser(scopeUser),
    getOrgFilterData(scopeUser),
    getPortfolio({ user: scopeUser, year: new Date().getFullYear() }),
  ]);

  const teamNames = Object.fromEntries(teams.map((t) => [t.id, t.name]));
  const byTeam = byTeamRows
    .map((r) => ({ name: teamNames[r.teamId] ?? "Unknown", count: r._count._all }))
    .sort((a, b) => b.count - a.count);

  const statusLabels: Record<string, string> = {
    DRAFT: "Draft", RETURNED: "Returned", READY_FOR_REVIEW: "Ready for review",
    REVIEWED: "Reviewed", APPROVED: "Approved", REJECTED: "Rejected", COMPLETED: "Completed",
  };
  const byStatus = byStatusRows.map((r) => ({ name: statusLabels[r.status] ?? r.status, count: r._count._all }));
  const byFlag = byFlagRows.map((r) => ({ name: r.deliveryFlag, count: r._count._all })).sort((a, b) => b.count - a.count);
  const byConfidence = byConfidenceRows.map((r) => ({ name: r.confidence, count: r._count._all }));
  const avgReadiness = readinessAgg._avg.readinessScore ?? 0;

  // Monthly activity + per-KPI sparklines (last 6 months, by created date + current status).
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return { key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleString("en", { month: "short" }) };
  });
  const monthIndex = new Map(months.map((m, i) => [m.key, i]));
  const zeros = () => months.map(() => 0);
  const spark = { total: zeros(), drafts: zeros(), review: zeros(), approved: zeros(), completed: zeros() };
  const trend = months.map((m) => ({ period: m.label, created: 0, approved: 0 }));
  for (const r of activityRows) {
    const d = new Date(r.createdAt);
    const idx = monthIndex.get(`${d.getFullYear()}-${d.getMonth()}`);
    if (idx == null) continue;
    spark.total[idx]++;
    trend[idx].created++;
    if (["DRAFT", "RETURNED"].includes(r.status)) spark.drafts[idx]++;
    if (["READY_FOR_REVIEW", "REVIEWED"].includes(r.status)) spark.review[idx]++;
    if (r.status === "APPROVED") { spark.approved[idx]++; trend[idx].approved++; }
    if (r.status === "COMPLETED") { spark.completed[idx]++; trend[idx].approved++; }
  }

  const attention = attentionRows.map((r) => ({
    id: r.id,
    reference: r.reference,
    title: r.title,
    tag: ACTION_FLAGS.includes(r.deliveryFlag) ? r.deliveryFlag : r.status,
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

      <OrgScopeFilters
        basePath="/home"
        units={orgFilter.units}
        teams={orgFilter.teams}
        lockedUnitIds={orgFilter.lockedUnitIds}
        org={org}
        team={teamFilter}
        workItemType={workItemType}
        release={release}
        quarters={quarters}
      />

      <HomeDashboard
        counts={{
          total,
          drafts,
          inReview: pendingReview + pendingApprove,
          approved,
          completed,
          reviewed: pendingApprove,
          readyForReview: pendingReview,
        }}
        byStatus={byStatus}
        byTeam={byTeam}
        byFlag={byFlag}
        byConfidence={byConfidence}
        avgReadiness={avgReadiness}
        spark={spark}
        trend={trend}
        attention={attention}
        health={{
          budgetRag: portfolio.budgetUtilisation.utilizedRag,
          budgetLabel: portfolio.budgetUtilisation.utilizedLabel,
          utilizationPct: portfolio.budgetUtilisation.utilizationPct,
          currency: portfolio.currency,
          utilised: portfolio.budgetUtilisation.utilizedAiCost,
          budget: portfolio.budgetUtilisation.budget,
          deliveryVariancePct: portfolio.deliveryVariance.variancePct,
          needsAction: attention.length,
          year: new Date().getFullYear(),
        }}
      />

      {showActions ? <HomeActionsPanel actions={actions} /> : null}
    </div>
  );
}
