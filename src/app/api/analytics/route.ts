import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFeature, requireUser } from "@/lib/api-auth";
import { fromSession, resolveEstimateScope } from "@/lib/scope";

export async function GET() {
  const { session, error } = await requireUser();
  if (error) return error;
  const forbidden = requireFeature(session!.user.role, "analytics");
  if (forbidden) return forbidden;
  const scope = await resolveEstimateScope(fromSession(session!.user));
  const estimates = await prisma.estimate.findMany({
    where: { resultJson: { not: null }, ...scope },
    include: { team: true, actuals: true },
  });
  const byTeam: Record<string, { count: number; avgSp: number }> = {};
  const governance: Record<string, number> = {};
  let actualRatioSum = 0;
  let actualRatioCount = 0;
  for (const estimate of estimates) {
    const result = JSON.parse(estimate.resultJson ?? "{}");
    const team = estimate.team.name;
    byTeam[team] ??= { count: 0, avgSp: 0 };
    byTeam[team].count += 1;
    byTeam[team].avgSp += result.selectedSp ?? 0;
    governance[result.governanceDecision ?? "UNKNOWN"] =
      (governance[result.governanceDecision ?? "UNKNOWN"] ?? 0) + 1;
    if (estimate.actuals?.varianceJson) {
      const v = JSON.parse(estimate.actuals.varianceJson);
      if (v.actualEstimatedEffortRatio) {
        actualRatioSum += v.actualEstimatedEffortRatio;
        actualRatioCount += 1;
      }
    }
  }
  const teams = Object.entries(byTeam).map(([name, v]) => ({
    name,
    count: v.count,
    avgSp: v.count ? v.avgSp / v.count : 0,
  }));
  return NextResponse.json({
    total: estimates.length,
    teams,
    governance,
    averageActualEstimatedRatio: actualRatioCount ? actualRatioSum / actualRatioCount : null,
  });
}
