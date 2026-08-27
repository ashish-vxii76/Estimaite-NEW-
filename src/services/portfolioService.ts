import { prisma } from "@/lib/prisma";
import { getActiveConfig } from "@/services/configService";
import {
  budgetStatus,
  calibrateDaysPerPoint,
  rollupPortfolio,
  type EstimateCalculationResult,
} from "@/domain/estimation";
import type { Prisma } from "@prisma/client";
import { parseRelease } from "@/lib/releasePeriod";
import { listCrewBudgets, sumCrewBudgets, visibleCrewIds } from "@/services/orgService";
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
  const forecastAiCost = sumAi(pipelineRows);
  const projectedAiCost = r2(utilizedAiCost + forecastAiCost);
  const utilizedStatus = budgetStatus(utilizedAiCost, budget);
  const projectedStatus = budgetStatus(projectedAiCost, budget);

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
    crewBudgets: budgetRows.map((row) => ({
      crewId: row.crewId,
      crewName: row.crew.name,
      amount: row.amount,
      currency: row.currency,
    })),
    budgetSource: "crew_yearly" as const,
    baselineBudgetRag: baselineRag,
    budgetUtilisation,
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
      where: { actuals: { isNot: null }, ...scope },
      include: { actuals: true },
    }),
  ]);

  const samples = estimates.flatMap((estimate) => {
    if (!estimate.actuals) return [];
    const variance = JSON.parse(estimate.actuals.varianceJson) as {
      actualEstimatedEffortRatio?: number | null;
    };
    if (!variance.actualEstimatedEffortRatio) return [];
    return [
      {
        resourceLevelId: estimate.devResourceLevel,
        actualEstimatedEffortRatio: variance.actualEstimatedEffortRatio,
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
