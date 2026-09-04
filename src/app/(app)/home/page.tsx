import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { HomeDashboard } from "@/components/HomeDashboard";
import { ScopeFilterBar } from "@/components/ScopeFilterBar";
import { can } from "@/lib/access";
import { fromSession, teamsForUser } from "@/lib/scope";
import { resolveHomeScope } from "@/lib/orgFilter";
import { computeHomeSplit } from "@/lib/homeSplit";
import { HomeOrgSplit, type OrgSplitRow } from "@/components/HomeOrgSplit";
import { welcomeLine } from "@/lib/roles";
import { getActiveConfig } from "@/services/configService";
import { getPortfolio } from "@/services/portfolioService";
import { releaseWhere, parseRelease } from "@/lib/releasePeriod";
import { descendantIds, resolveSeatLevel, resolveOrgCurrency, orgCurrenciesForCrews } from "@/services/orgService";
import { CREW_LEVEL } from "@/lib/orgLevel";

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
  // Crew-leadership surfaces (budget strip, roll-up/calibration shortcuts) need a Crew-or-above
  // seat — a Pod-level Delivery Lead sees estimates in scope but not the crew-economics panels.
  const seatLevel = await resolveSeatLevel(scopeUser);
  const isCrewLevelOrAbove = seatLevel >= CREW_LEVEL;
  const homeScope = await resolveHomeScope(scopeUser, org, teamFilter);
  // Currency of the scope. >1 company currency = mixed → no single-currency consolidation (needs FX).
  const scopeCurrencies = await orgCurrenciesForCrews(homeScope.crewIds);
  const budgetCurrency = scopeCurrencies.length === 1 ? scopeCurrencies[0] : null; // null = mixed
  const budgetMixedCurrency = scopeCurrencies.length > 1;
  const filter = {
    ...homeScope.where,
    ...(workItemType ? { workItemType } : {}),
    ...releaseWhere(release),
  };

  // Portfolio (budget / delivery variance) must follow the same org/team/release selection as
  // the rest of the dashboard. Budget is an annual, per-crew figure, so it responds to scope
  // (org/team) and the release YEAR — but not workItemType, which is a register-composition
  // filter (rescoping the annual budget by work-item type would make committed-vs-budget
  // incoherent). Year: the selected release's year, else the current year.
  const yearStr = release ? parseRelease(release).year : "";
  const releaseYear = /^\d{4}$/.test(yearStr) ? Number(yearStr) : new Date().getFullYear();
  let pfCrewIds: string[] | null = homeScope.crewIds;
  let pfTeamId: string | undefined;
  if (teamFilter) {
    const selTeam = await prisma.team.findUnique({ where: { id: teamFilter }, select: { crewId: true } });
    pfTeamId = teamFilter;
    pfCrewIds = selTeam?.crewId ? [selTeam.crewId] : []; // budget stays at the pod's crew
  } else if (org) {
    const ids = await descendantIds(org);
    const orgCrews = (
      await prisma.orgUnit.findMany({ where: { id: { in: ids }, type: "CREW", active: true }, select: { id: true } })
    ).map((c) => c.id);
    pfCrewIds = homeScope.crewIds == null ? orgCrews : homeScope.crewIds.filter((id) => orgCrews.includes(id));
  }

  const attentionWhere = {
    ...filter,
    OR: [{ deliveryFlag: { in: ACTION_FLAGS } }, { status: { in: ["RETURNED", "REJECTED"] } }],
  };

  const [
    total, drafts, pendingReview, pendingApprove, approved, completed,
    byTeamRows, byStatusRows, byFlagRows, byConfidenceRows, readinessAgg,
    activityRows, attentionRows, needsActionTotal, team, config, teams, orgFilter, portfolio,
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
      where: attentionWhere,
      select: { id: true, reference: true, title: true, deliveryFlag: true, status: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 6,
    }),
    prisma.estimate.count({ where: attentionWhere }),
    session.user.teamId
      ? prisma.team.findUnique({ where: { id: session.user.teamId }, select: { name: true } })
      : Promise.resolve(null),
    getActiveConfig(),
    teamsForUser(scopeUser),
    Promise.resolve(homeScope.orgFilter),
    getPortfolio({ user: scopeUser, crewIds: pfCrewIds ?? undefined, teamId: pfTeamId, year: releaseYear, currency: budgetCurrency ?? undefined }),
  ]);

  // Estimates computed under a superseded config version (governance/risk signal).
  const configStaleCount = await prisma.estimate.count({
    where: { ...filter, configurationVersionId: { not: config.versionId } },
  });

  const teamNames = Object.fromEntries(teams.map((t) => [t.id, t.name]));
  const byTeam = byTeamRows
    .map((r) => ({ name: teamNames[r.teamId] ?? "Unknown", count: r._count._all }))
    .sort((a, b) => b.count - a.count);

  const statusLabels: Record<string, string> = {
    DRAFT: "Draft", RETURNED: "Returned", READY_FOR_REVIEW: "Ready for review",
    REVIEWED: "Awaiting approval", APPROVED: "Approved", REJECTED: "Rejected", COMPLETED: "Completed",
    CANCELLED: "Cancelled",
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

  // --- Cross-organization split: group visuals by the viewer's org level (DEC-016 aligned).
  // Renders only when the viewer can see more than one org at that level. Counts use the
  // viewer's full visible scope (stable across drill-downs), not the current org selection.
  const split = computeHomeSplit(orgFilter.units, orgFilter.teams);
  let orgSplitRows: OrgSplitRow[] = [];
  if (split.units.length > 1) {
    const splitFilter = {
      ...homeScope.base,
      ...(workItemType ? { workItemType } : {}),
      ...releaseWhere(release),
    };
    const year = releaseYear;
    const [statusByTeam, readinessByTeam, needsByTeam, portfolios] = await Promise.all([
      prisma.estimate.groupBy({ by: ["teamId", "status"], where: splitFilter, _count: { _all: true } }),
      prisma.estimate.groupBy({
        by: ["teamId"],
        where: { ...splitFilter, readinessScore: { gt: 0 } },
        _sum: { readinessScore: true },
        _count: { _all: true },
      }),
      prisma.estimate.groupBy({
        by: ["teamId"],
        where: { ...splitFilter, OR: [{ deliveryFlag: { in: ACTION_FLAGS } }, { status: { in: ["RETURNED", "REJECTED"] } }] },
        _count: { _all: true },
      }),
      Promise.all(
        split.units.map(async (u) => {
          const currency = await resolveOrgCurrency({ orgUnitId: u.id });
          return getPortfolio({ user: scopeUser, crewIds: split.unitCrewIds[u.id] ?? [], year, currency })
            .then((p) => ({ id: u.id, p }))
            .catch(() => ({ id: u.id, p: null as Awaited<ReturnType<typeof getPortfolio>> | null }));
        }),
      ),
    ]);

    const unitOf = (teamId: string) => split.teamToUnitId[teamId] ?? null;
    const acc: Record<string, OrgSplitRow> = {};
    for (const u of split.units) {
      acc[u.id] = { id: u.id, name: u.name, total: 0, drafts: 0, inReview: 0, approved: 0, completed: 0, avgReadiness: 0, needsAction: 0, money: null };
    }
    for (const r of statusByTeam) {
      const uid = unitOf(r.teamId);
      if (!uid || !acc[uid]) continue;
      const c = r._count._all;
      acc[uid].total += c;
      if (["DRAFT", "RETURNED"].includes(r.status)) acc[uid].drafts += c;
      else if (["READY_FOR_REVIEW", "REVIEWED"].includes(r.status)) acc[uid].inReview += c;
      else if (r.status === "APPROVED") acc[uid].approved += c;
      else if (r.status === "COMPLETED") acc[uid].completed += c;
    }
    const readinessSum: Record<string, { sum: number; n: number }> = {};
    for (const r of readinessByTeam) {
      const uid = unitOf(r.teamId);
      if (!uid || !acc[uid]) continue;
      const e = readinessSum[uid] ?? { sum: 0, n: 0 };
      e.sum += r._sum.readinessScore ?? 0;
      e.n += r._count._all;
      readinessSum[uid] = e;
    }
    for (const uid of Object.keys(readinessSum)) {
      const e = readinessSum[uid];
      if (acc[uid]) acc[uid].avgReadiness = e.n > 0 ? e.sum / e.n : 0;
    }
    for (const r of needsByTeam) {
      const uid = unitOf(r.teamId);
      if (uid && acc[uid]) acc[uid].needsAction += r._count._all;
    }
    for (const { id, p } of portfolios) {
      if (!p || !acc[id]) continue;
      acc[id].money = {
        utilizationPct: p.budgetUtilisation.utilizationPct,
        utilised: p.budgetUtilisation.utilizedAiCost,
        budget: p.budgetUtilisation.budget,
        currency: p.currency,
        variancePct: p.deliveryVariance.variancePct,
        rag: p.budgetUtilisation.utilizedRag,
      };
    }
    orgSplitRows = split.units.map((u) => acc[u.id]);
  }

  // The By-company panel follows the filter: a selected org/team narrows it to the ONE split unit
  // that contains the selection (so filtering to a company shows just that company's box); no
  // selection shows every unit in scope.
  if (orgSplitRows.length > 0 && (org || teamFilter)) {
    let focusUnitId: string | null = null;
    if (org) {
      const unitById = new Map(orgFilter.units.map((u) => [u.id, u]));
      let cur = unitById.get(org);
      while (cur) {
        if (split.units.some((u) => u.id === cur!.id)) { focusUnitId = cur.id; break; }
        cur = cur.parentId ? unitById.get(cur.parentId) : undefined;
      }
    } else if (teamFilter) {
      focusUnitId = split.teamToUnitId[teamFilter] ?? null;
    }
    if (focusUnitId) orgSplitRows = orgSplitRows.filter((r) => r.id === focusUnitId);
  }

  const quarters = config.releaseQuarters ?? [];
  // Overall budget RAG rollup (per health band) — currency-agnostic, so it works across the mixed
  // currencies an App admin sees. Feeds the strip in place of a (meaningless) cross-currency sum.
  const budgetRagSummary = orgSplitRows.reduce(
    (a, r) => {
      const k = r.money?.rag ?? "UNSET";
      a[k] = (a[k] ?? 0) + 1;
      return a;
    },
    {} as Record<string, number>,
  );

  const isAppAdmin = session.user.role === "ADMINISTRATOR" && !homeScope.scopeLabel;
  // App admin → "(Application Admin)"; scoped admin → "(Citi · Admin)"; others → their team.
  const teamName = homeScope.scopeLabel ?? (session.user.role === "ADMINISTRATOR" ? null : team?.name);
  const welcome = isAppAdmin
    ? `Welcome ${session.user.name?.trim() || "there"} (Application Admin)`
    : welcomeLine(session.user.name, session.user.role, teamName);

  return (
    <div className="space-y-6">
      <div>
        <p className="kicker">Home</p>
        <h1 className="font-display text-2xl font-semibold text-[var(--navy)]">
          {welcome}
        </h1>
        <p className="mt-1 text-sm text-[var(--muted)]">Signed in as {session.user.email}.</p>
      </div>

      <ScopeFilterBar
        basePath="/home"
        units={orgFilter.units}
        teams={orgFilter.teams}
        lockedUnitIds={orgFilter.lockedUnitIds}
        lockedTeamId={orgFilter.lockedTeamId}
        org={org}
        team={teamFilter}
        workItemType={workItemType}
        release={release}
        quarters={quarters}
      />

      {orgSplitRows.length >= 1 ? (
        <HomeOrgSplit splitLabel={split.splitLabel} rows={orgSplitRows} />
      ) : null}

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
          needsAction: needsActionTotal,
          year: releaseYear,
        }}
        showBudget={isCrewLevelOrAbove}
        budgetMixedCurrency={budgetMixedCurrency}
        budgetRagSummary={budgetRagSummary}
        configStale={configStaleCount}
      />
    </div>
  );
}
