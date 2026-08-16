import { prisma } from "@/lib/prisma";
import { getActiveConfig } from "@/services/configService";
import {
  calibrateDaysPerPoint,
  rollupPortfolio,
  type EstimateCalculationResult,
} from "@/domain/estimation";

function parseResult(json: string | null): EstimateCalculationResult | null {
  if (!json) return null;
  try {
    return JSON.parse(json) as EstimateCalculationResult;
  } catch {
    return null;
  }
}

export async function getPortfolio() {
  const [estimates, settings] = await Promise.all([
    prisma.estimate.findMany({
      include: { team: true, actuals: true },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.portfolioSettings.upsert({
      where: { id: "default" },
      update: {},
      create: { id: "default", currency: "CHF" },
    }),
  ]);

  const register = estimates.map((estimate) => {
    const result = parseResult(estimate.resultJson);
    return {
      id: estimate.id,
      reference: estimate.reference,
      title: estimate.title,
      team: estimate.team.name,
      status: estimate.status,
      workItemType: estimate.workItemType,
      governanceDecision: result?.governanceDecision ?? "—",
      effectiveTshirt: result?.effectiveTshirt ?? "—",
      selectedSp: result?.selectedSp ?? null,
      aiAdjustedDeliveryCost: result?.aiAdjustedDeliveryCost ?? 0,
      baselineDeliveryCost: result?.baselineDeliveryCost ?? 0,
      adjustedTotalEffortPd: result?.adjustedTotalEffortPd ?? 0,
      currency: result?.currency ?? estimate.currency,
      hasActuals: Boolean(estimate.actuals),
    };
  });

  const calculated = register.filter((row) => row.effectiveTshirt !== "—");
  const rollup = rollupPortfolio(
    calculated.map((row) => ({
      governanceDecision: row.governanceDecision,
      effectiveTshirt: row.effectiveTshirt,
      aiAdjustedDeliveryCost: row.aiAdjustedDeliveryCost,
      baselineDeliveryCost: row.baselineDeliveryCost,
      adjustedTotalEffortPd: row.adjustedTotalEffortPd,
    })),
    settings.budget,
  );

  return {
    ...rollup,
    currency: settings.currency,
    register,
  };
}

export async function setPortfolioBudget(budget: number | null, currency: string) {
  return prisma.portfolioSettings.upsert({
    where: { id: "default" },
    update: { budget, currency },
    create: { id: "default", budget, currency },
  });
}

export async function getCalibration() {
  const [config, estimates] = await Promise.all([
    getActiveConfig(),
    prisma.estimate.findMany({
      where: { actuals: { isNot: null } },
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
