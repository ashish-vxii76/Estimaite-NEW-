import { StatusBadge } from "@/components/ui";

async function loadAnalytics() {
  const { prisma } = await import("@/lib/prisma");
  const estimates = await prisma.estimate.findMany({
    where: { resultJson: { not: null } },
    include: { team: true, actuals: true },
  });
  const governance: Record<string, number> = {};
  const byTeam: Record<string, number> = {};
  let ratio = 0;
  let ratioCount = 0;
  for (const estimate of estimates) {
    const result = JSON.parse(estimate.resultJson ?? "{}");
    governance[result.governanceDecision ?? "UNKNOWN"] =
      (governance[result.governanceDecision ?? "UNKNOWN"] ?? 0) + 1;
    byTeam[estimate.team.name] = (byTeam[estimate.team.name] ?? 0) + 1;
    if (estimate.actuals) {
      const v = JSON.parse(estimate.actuals.varianceJson);
      if (v.actualEstimatedEffortRatio) {
        ratio += v.actualEstimatedEffortRatio;
        ratioCount += 1;
      }
    }
  }
  return { total: estimates.length, governance, byTeam, avgRatio: ratioCount ? ratio / ratioCount : null };
}

export default async function AnalyticsPage() {
  const data = await loadAnalytics();
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold">Analytics</h1>
      <p className="text-sm text-[var(--muted)]">
        Calibration is observational. Automatic parameter changes require governance approval.
      </p>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="card p-4">
          <p className="text-xs uppercase text-[var(--muted)]">Calculated estimates</p>
          <p className="text-2xl font-semibold">{data.total}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs uppercase text-[var(--muted)]">Avg actual/estimated ratio</p>
          <p className="text-2xl font-semibold">{data.avgRatio ? data.avgRatio.toFixed(2) : "—"}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs uppercase text-[var(--muted)]">Teams with estimates</p>
          <p className="text-2xl font-semibold">{Object.keys(data.byTeam).length}</p>
        </div>
      </div>
      <section className="card p-5">
        <h2 className="font-medium">Governance outcomes</h2>
        <ul className="mt-3 space-y-2">
          {Object.entries(data.governance).map(([k, v]) => (
            <li key={k} className="flex items-center justify-between text-sm">
              <StatusBadge status={k} />
              <span>{v}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
