import { getCalibration } from "@/services/portfolioService";
import { CalibrationActions } from "@/components/CalibrationActions";
import { OrgCrewTeamFilters } from "@/components/OrgCrewTeamFilters";
import { ExplanationPanel } from "@/components/ui";
import { auth } from "@/auth";
import { can } from "@/lib/access";
import { fromSession, resolveEstimateScope, teamsForUser } from "@/lib/scope";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export default async function CalibrationPage({
  searchParams,
}: {
  searchParams: Promise<{ crew?: string; team?: string }>;
}) {
  const session = await auth();
  const { crew: crewFilter = "", team: teamFilter = "" } = await searchParams;
  const scope = await resolveEstimateScope(fromSession(session!.user));
  const orgWhere: Prisma.EstimateWhereInput = teamFilter
    ? { teamId: teamFilter }
    : crewFilter
      ? { team: { crewId: crewFilter } }
      : {};
  const where: Prisma.EstimateWhereInput = { ...scope, ...orgWhere };

  const [data, teams, crews] = await Promise.all([
    getCalibration(where),
    teamsForUser(fromSession(session!.user)),
    prisma.orgUnit.findMany({
      where: { type: "CREW", active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);
  const canApply = can(session?.user.role, "calibration.apply", "RW");
  const filteredTeams = crewFilter
    ? teams.filter((t) => t.crewId === crewFilter)
    : teams;

  const scopeLabel = [
    crewFilter ? crews.find((c) => c.id === crewFilter)?.name ?? "Crew" : null,
    teamFilter ? filteredTeams.find((t) => t.id === teamFilter)?.name ?? "Pod" : null,
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
          {scopeLabel ? ` for ${scopeLabel}` : " in your org scope"}.
        </p>
      </div>

      <OrgCrewTeamFilters
        basePath="/calibration"
        crews={crews}
        teams={filteredTeams.map((t) => ({ id: t.id, name: t.name }))}
        crew={crewFilter}
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
        <CalibrationActions rows={data.rows} crew={crewFilter} team={teamFilter} />
      ) : (
        <p className="text-sm text-[var(--muted)]">
          Administrator approval is required to apply suggested Days/Point to configuration.
        </p>
      )}
    </div>
  );
}
