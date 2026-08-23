import { prisma } from "@/lib/prisma";
import { getActiveConfig } from "@/services/configService";
import {
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
  user?: { id: string; role: string };
};

export async function getPortfolio(options: PortfolioOptions | Prisma.EstimateWhereInput = {}) {
  const opts: PortfolioOptions =
    options && ("scope" in options || "year" in options || "crewId" in options || "user" in options)
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

  const teamFilter: Prisma.EstimateWhereInput =
    crewIds == null
      ? {}
      : crewIds.length === 0
        ? { id: "__none__" }
        : { team: { crewId: { in: crewIds } } };

  const where: Prisma.EstimateWhereInput = {
    ...opts.scope,
    ...teamFilter,
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

  return {
    ...rollup,
    currency: "CHF",
    year,
    crewBudgets: budgetRows.map((row) => ({
      crewId: row.crewId,
      crewName: row.crew.name,
      amount: row.amount,
      currency: row.currency,
    })),
    budgetSource: "crew_yearly" as const,
    baselineBudgetRag: baselineRag,
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
