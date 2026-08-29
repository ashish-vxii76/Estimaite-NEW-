import { prisma } from "@/lib/prisma";
import { getActiveConfig } from "@/services/configService";
import {
  budgetStatus,
  calibrateDaysPerPoint,
  isWithinCalibrationWindow,
  rollupPortfolio,
  type EstimateCalculationResult,
} from "@/domain/estimation";
import type { Prisma } from "@prisma/client";
import { parseRelease } from "@/lib/releasePeriod";
import { listCrewBudgets, sumCrewBudgets, visibleCrewIds } from "@/services/orgService";
import { isCalibrationLifecycleEligible } from "@/lib/estimateLifecycle";
import type { OrgPath } from "@/lib/orgTypes";

function parseResult(json: string | null): EstimateCalculationResult | null {
  if (!json) return null;
  try {
    return JSON.parse(json) as EstimateCalculationResult;
  } catch {
    return null;
  }
}

function parseOrgPath(json: string | null | undefined): OrgPath | null {
  if (!json) return null;
  try {
    return JSON.parse(json) as OrgPath;
  } catch {
    return null;
  }
}

export type PortfolioOptions = {
  scope?: Prisma.EstimateWhereInput;
  /** Budget year (= release year). Defaults to current calendar year. */
  year?: number;
  /** Optional crew filter (org roll-up drill-down). */
  crewId?: string | null;
  /** Crews implied by an org-cascade selection (any level). Intersected with visibility. */
  crewIds?: string[] | null;
  /** Narrow the register to a single pod (budget stays at the pod's crew). */
  teamId?: string | null;
  /** Reporting currency for the rollup totals (org/Company currency). Defaults CHF. */
  currency?: string;
  user?: { id: string; role: string };
};

export async function getPortfolio(options: PortfolioOptions | Prisma.EstimateWhereInput = {}) {
  const opts: PortfolioOptions =
    options && ("scope" in options || "year" in options || "crewId" in options || "crewIds" in options || "teamId" in options || "currency" in options || "user" in options)
      ? (options as PortfolioOptions)
      : { scope: options as Prisma.EstimateWhereInput };

  const year = opts.year ?? new Date().getFullYear();
  const yearPrefix = `${year}-`;

  let crewIds: string[] | null = null;
  if (opts.user) {
    crewIds = await visibleCrewIds(opts.user);
  }
  if (opts.crewId) {
    crewIds = crewIds == null ? [opts.crewId] : crewIds.filter((id) => id === opts.crewId);
  }
  if (opts.crewIds) {
    crewIds = crewIds == null ? opts.crewIds : crewIds.filter((id) => opts.crewIds!.includes(id));
  }

  const teamFilter: Prisma.EstimateWhereInput =
    crewIds == null
      ? {}
      : crewIds.length === 0
        ? { id: "__none__" }
        : { team: { crewId: { in: crewIds } } };

  const where: Prisma.EstimateWhereInput = {
    ...opts.scope,
    ...teamFilter,
    ...(opts.teamId ? { teamId: opts.teamId } : {}),
    release: { startsWith: yearPrefix },
  };

  const [estimates, budgetTotal, budgetRows] = await Promise.all([
    prisma.estimate.findMany({
      where,
      include: { team: { include: { crew: true } }, actuals: true },
      orderBy: { updatedAt: "desc" },
    }),
    sumCrewBudgets(year, crewIds),
    listCrewBudgets(year, crewIds),
  ]);

  const register = estimates.map((estimate) => {
    const result = parseResult(estimate.resultJson);
    const orgPath = parseOrgPath(estimate.orgPathJson);
    return {
      id: estimate.id,
      reference: estimate.reference,
      title: estimate.title,
      team: estimate.team.name,
      crewId: estimate.team.crewId ?? null,
      crew: estimate.team.crew?.name ?? orgPath?.crewName ?? "—",
      programme: estimate.programme ?? "",
      project: estimate.project ?? "",
      release: estimate.release ?? "",
      status: estimate.status,
      workItemType: estimate.workItemType,
      governanceDecision: result?.governanceDecision ?? "—",
      deliveryFlag: result?.deliveryFlag ?? result?.governanceDecision ?? "—",
      effectiveTshirt: result?.effectiveTshirt ?? "—",
      selectedSp: result?.selectedSp ?? null,
      aiAdjustedDeliveryCost: result?.aiAdjustedDeliveryCost ?? null,
      baselineDeliveryCost: result?.baselineDeliveryCost ?? null,
      adjustedTotalEffortPd: result?.adjustedTotalEffortPd ?? 0,
      currency: result?.currency ?? estimate.currency,
      hasActuals: Boolean(estimate.actuals),
      actualEffortPd: estimate.actuals
        ? estimate.actuals.actualDevPd + estimate.actuals.actualQaPd
        : null,
      orgPath,
    };
  });

  const calculated = register.filter((row) => row.effectiveTshirt !== "—");
  const budget = budgetTotal > 0 ? budgetTotal : null;
  const rollup = rollupPortfolio(
    calculated.map((row) => ({
      governanceDecision: row.governanceDecision,
      deliveryFlag: row.deliveryFlag,
      effectiveTshirt: row.effectiveTshirt,
      aiAdjustedDeliveryCost: row.aiAdjustedDeliveryCost,
      baselineDeliveryCost: row.baselineDeliveryCost,
      adjustedTotalEffortPd: row.adjustedTotalEffortPd,
    })),
    budget,
  );

  const baselineRag =
    budget != null && budget > 0
      ? rollup.totalBaselineCost <= budget
        ? "GREEN"
        : rollup.totalBaselineCost <= budget * 1.1
          ? "AMBER"
          : "RED"
      : "UNSET";

  // Budget utilisation: committed = Approved + Completed (spend); forecast = in-pipeline.
  // Cost-deferred CRs (ROM Epics, aiAdjustedDeliveryCost null) are costed at Story level → excluded.
  const COMMITTED_STATUS = new Set(["APPROVED", "COMPLETED"]);
  const PIPELINE_STATUS = new Set(["READY_FOR_REVIEW", "REVIEWED"]);
  const r2 = (n: number) => Math.round(n * 100) / 100;
  const sumAi = (rows: typeof calculated) =>
    r2(rows.reduce((s, x) => s + (x.aiAdjustedDeliveryCost ?? 0), 0));
  const sumBase = (rows: typeof calculated) =>
    r2(rows.reduce((s, x) => s + (x.baselineDeliveryCost ?? 0), 0));

  const committedRows = calculated.filter(
    (r) => COMMITTED_STATUS.has(r.status) && r.aiAdjustedDeliveryCost != null,
  );
  const pipelineRows = calculated.filter(
    (r) => PIPELINE_STATUS.has(r.status) && r.aiAdjustedDeliveryCost != null,
  );
  const utilizedAiCost = sumAi(committedRows);
  const utilizedBaselineCost = sumBase(committedRows);
  // Committed AI spend grouped by crew, for per-crew budget RAG.
  const committedByCrew = new Map<string, number>();
  const costByCrewMap = new Map<string, number>();
  for (const r of committedRows) {
    if (r.crewId) committedByCrew.set(r.crewId, (committedByCrew.get(r.crewId) ?? 0) + (r.aiAdjustedDeliveryCost ?? 0));
    const name = r.crew || "—";
    costByCrewMap.set(name, (costByCrewMap.get(name) ?? 0) + (r.aiAdjustedDeliveryCost ?? 0));
  }
  const costByCrew = [...costByCrewMap.entries()]
    .map(([crewName, cost]) => ({ crewName, cost: r2(cost) }))
    .sort((a, b) => b.cost - a.cost);

  // Quarterly burn-up: cumulative committed AI spend across the year's quarters.
  const QUARTERS = ["Q1", "Q2", "Q3", "Q4"];
  const perQuarter = new Map(QUARTERS.map((q) => [q, 0]));
  for (const r of committedRows) {
    const { quarter } = parseRelease(r.release);
    if (quarter && perQuarter.has(quarter)) {
      perQuarter.set(quarter, perQuarter.get(quarter)! + (r.aiAdjustedDeliveryCost ?? 0));
    }
  }
  let cumulative = 0;
  const burnUp = QUARTERS.map((q) => {
    cumulative = r2(cumulative + (perQuarter.get(q) ?? 0));
    return { quarter: q, committed: r2(perQuarter.get(q) ?? 0), cumulative };
  });
  const forecastAiCost = sumAi(pipelineRows);
  const projectedAiCost = r2(utilizedAiCost + forecastAiCost);
  const utilizedStatus = budgetStatus(utilizedAiCost, budget);
  const projectedStatus = budgetStatus(projectedAiCost, budget);

  // Delivery variance: actual vs estimated effort for completed CRs that have actuals.
  const delivered = register.filter((r) => r.status === "COMPLETED" && r.actualEffortPd != null);
  const estimatedEffortPd = r2(delivered.reduce((s, r) => s + (r.adjustedTotalEffortPd ?? 0), 0));
  const actualEffortPd = r2(delivered.reduce((s, r) => s + (r.actualEffortPd ?? 0), 0));
  const varByCrew = new Map<string, { est: number; act: number; name: string }>();
  for (const r of delivered) {
    if (!r.crewId) continue;
    const e = varByCrew.get(r.crewId) ?? { est: 0, act: 0, name: r.crew };
    e.est += r.adjustedTotalEffortPd ?? 0;
    e.act += r.actualEffortPd ?? 0;
    varByCrew.set(r.crewId, e);
  }
  const deliveryVariance = {
    sampleCount: delivered.length,
    estimatedEffortPd,
    actualEffortPd,
    variancePd: r2(actualEffortPd - estimatedEffortPd),
    variancePct: estimatedEffortPd > 0 ? actualEffortPd / estimatedEffortPd - 1 : null,
    byCrew: [...varByCrew.entries()].map(([crewId, v]) => ({
      crewId,
      crewName: v.name,
      estimatedEffortPd: r2(v.est),
      actualEffortPd: r2(v.act),
      variancePct: v.est > 0 ? v.act / v.est - 1 : null,
    })),
  };

  const budgetUtilisation = {
    budget,
    utilizedAiCost,
    utilizedBaselineCost,
    forecastAiCost,
    projectedAiCost,
    remaining: budget != null ? r2(budget - utilizedAiCost) : null,
    utilizationPct: budget != null && budget > 0 ? utilizedAiCost / budget : null,
    variance: budget != null ? r2(utilizedAiCost - budget) : null,
    utilizedRag: utilizedStatus.rag,
    utilizedLabel: utilizedStatus.label,
    projectedRag: projectedStatus.rag,
    committedCount: committedRows.length,
    pipelineCount: pipelineRows.length,
  };

  return {
    ...rollup,
    currency: opts.currency ?? "CHF",
    year,
    crewBudgets: budgetRows.map((row) => {
      const utilised = r2(committedByCrew.get(row.crewId) ?? 0);
      const status = budgetStatus(utilised, row.amount);
      return {
        crewId: row.crewId,
        crewName: row.crew.name,
        amount: row.amount,
        currency: row.currency,
        utilised,
        remaining: r2(row.amount - utilised),
        utilisationPct: row.amount > 0 ? utilised / row.amount : null,
        rag: status.rag,
      };
    }),
    budgetSource: "crew_yearly" as const,
    baselineBudgetRag: baselineRag,
    budgetUtilisation,
    deliveryVariance,
    burnUp,
    costByCrew,
    register,
  };
}

/** @deprecated Global portfolio budget — prefer Crew yearly budgets. Kept for API compat. */
export async function setPortfolioBudget(budget: number | null, currency: string) {
  return prisma.portfolioSettings.upsert({
    where: { id: "default" },
    update: { budget, currency },
    create: { id: "default", budget, currency },
  });
}

export async function getCalibration(scope?: Prisma.EstimateWhereInput) {
  const [config, estimates] = await Promise.all([
    getActiveConfig(),
    prisma.estimate.findMany({
      // Coarse fetch: COMPLETED CRs with actuals. Derived DEC-008 D5 eligibility (descoped,
      // baseline versions) + DEC-007 A4 window are applied per-row below.
      where: { status: "COMPLETED", actuals: { isNot: null }, ...scope },
      include: { actuals: true, baselines: true },
    }),
  ]);

  const now = new Date();
  const samples = estimates.flatMap((estimate) => {
    if (!estimate.actuals) return [];
    // DEC-008 D5: derived lifecycle eligibility — COMPLETED, not descoped, and exactly one
    // committed baseline (i.e. a baseline exists and it was not re-baselined). Excludes cancelled
    // (never COMPLETED), descoped, un-baselined, and re-baselined CRs.
    const baselineVersions = estimate.baselines.length;
    if (
      !isCalibrationLifecycleEligible({
        status: estimate.status,
        descoped: estimate.descoped,
        baselineVersions,
      })
    ) {
      return [];
    }
    // DEC-007 A4: trailing 12-month window on the authoritative finalisedAt (null → excluded).
    if (!isWithinCalibrationWindow(estimate.actuals.finalisedAt, now)) return [];
    // DEC-008 D3: estimated effort comes from the committed baseline snapshot (the single v1),
    // never live resultJson. DEC-007 A1: raw effort so aggregation is effort-weighted; attribution
    // preserved (combined dev+qa under the Dev resource level); A3 size/clamp applied downstream.
    const baseline = estimate.baselines[0];
    const snap = parseResult(baseline.snapshot);
    if (!snap) return [];
    const estimatedEffortPd = (snap.adjustedDevEffortPd ?? 0) + (snap.adjustedQaEffortPd ?? 0);
    const actualEffortPd = estimate.actuals.actualDevPd + estimate.actuals.actualQaPd;
    return [
      {
        resourceLevelId: estimate.devResourceLevel,
        actualEffortPd,
        estimatedEffortPd,
      },
    ];
  });

  const calibration = calibrateDaysPerPoint({
    levels: config.resourceLevels,
    samples,
  });

  return {
    ...calibration,
    sampleCount: samples.length,
    configVersionId: config.versionId,
  };
}

export function releaseYearFromEstimate(release: string | null | undefined): number | null {
  const { year } = parseRelease(release);
  return year ? Number(year) : null;
}
