import { getCalibration } from "@/services/portfolioService";
import { CalibrationActions } from "@/components/CalibrationActions";
import { OrgLockedPathFilters } from "@/components/OrgLockedPathFilters";
import { ExplanationPanel } from "@/components/ui";
import { auth } from "@/auth";
import { can } from "@/lib/access";
import { fromSession, resolveEstimateScope, teamsForUser } from "@/lib/scope";
import { lockedOrgPathForUser } from "@/lib/lockedOrgPath";
import type { Prisma } from "@prisma/client";

export default async function CalibrationPage({
  searchParams,
}: {
  searchParams: Promise<{ team?: string }>;
}) {
  const session = await auth();
  const { team: teamFilter = "" } = await searchParams;
  const scope = await resolveEstimateScope(fromSession(session!.user));
  const lockedPath = await lockedOrgPathForUser(session!.user.id);
  const orgWhere: Prisma.EstimateWhereInput = teamFilter
    ? { teamId: teamFilter }
    : lockedPath.crewId
      ? { team: { crewId: lockedPath.crewId } }
      : {};
  const where: Prisma.EstimateWhereInput = { ...scope, ...orgWhere };

  const [data, teams] = await Promise.all([
    getCalibration(where),
    teamsForUser(fromSession(session!.user)),
  ]);
  const canApply = can(session?.user.role, "calibration.apply", "RW");
  const pods = lockedPath.crewId
    ? teams.filter((t) => t.crewId === lockedPath.crewId)
    : teams;

  const scopeLabel = [
    lockedPath.crewName !== "All" ? lockedPath.crewName : null,
    teamFilter ? pods.find((t) => t.id === teamFilter)?.name ?? "Pod" : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="space-y-6">
      <div>
        <p className="kicker">Learn → Recalibrate</p>
        <h1 className="text-2xl font-semibold">Calibration</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Actual vs estimate → suggested Days/Point. Derived from Register Actual/Est ratios by Dev
          resource level (CRs with actuals)
          {scopeLabel ? ` for ${scopeLabel}` : " in your locked org path"}.
        </p>
      </div>

      <OrgLockedPathFilters
        basePath="/calibration"
        path={lockedPath}
        teams={pods.map((t) => ({ id: t.id, name: t.name }))}
        team={teamFilter}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <div className="card p-4">
          <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Overall Avg Ratio</p>
          <p className="mt-1 text-2xl font-semibold">
            {data.overallAvgRatio == null ? "—" : data.overallAvgRatio.toFixed(2)}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs uppercase tracking-wide text-[var(--muted)]">CRs with actuals</p>
          <p className="mt-1 text-2xl font-semibold">{data.sampleCount}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Config version</p>
          <p className="mt-1 text-sm font-medium">{data.configVersionId}</p>
        </div>
      </div>

      <section className="card overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-[var(--panel-2)] text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3">Resource Level</th>
              <th>Current Days/Point</th>
              <th>Avg Actual/Est Ratio</th>
              <th>Suggested Days/Point</th>
              <th># Samples</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row) => (
              <tr key={row.id} className="border-t border-[var(--line)]">
                <td className="px-4 py-3">{row.name}</td>
                <td>{row.currentDaysPerPoint.toFixed(2)}</td>
                <td>{row.avgActualEstRatio == null ? "" : row.avgActualEstRatio.toFixed(2)}</td>
                <td className="font-medium text-[var(--navy)]">
                  {row.samples < 3 || row.suggestedDaysPerPoint == null
                    ? row.samples < 3
                      ? `Insufficient data — ${row.samples} of 3`
                      : ""
                    : row.suggestedDaysPerPoint.toFixed(2)}
                </td>
                <td>{row.samples}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <ExplanationPanel {...data.explanation} />

      {canApply ? (
        <CalibrationActions rows={data.rows} team={teamFilter} />
      ) : (
        <p className="text-sm text-[var(--muted)]">
          Administrator approval is required to apply suggested Days/Point to configuration.
        </p>
      )}
    </div>
  );
}
