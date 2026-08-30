import { getCalibration, listCalibrationRuns } from "@/services/portfolioService";
import { CalibrationActions } from "@/components/CalibrationActions";
import { ScopeFilterBar } from "@/components/ScopeFilterBar";
import { ExplanationPanel } from "@/components/ui";
import { auth } from "@/auth";
import { can } from "@/lib/access";
import { fromSession } from "@/lib/scope";
import { getOrgFilterData, resolveOrgSelectionWhere } from "@/lib/orgFilter";
import { lockedOrgPathForUser } from "@/lib/lockedOrgPath";
import { prisma } from "@/lib/prisma";

export default async function CalibrationPage({
  searchParams,
}: {
  searchParams: Promise<{ team?: string; org?: string }>;
}) {
  const session = await auth();
  const { team: teamFilter = "", org = "" } = await searchParams;
  const scopeUser = fromSession(session!.user);
  const [where, orgFilter] = await Promise.all([
    resolveOrgSelectionWhere(scopeUser, org, teamFilter),
    getOrgFilterData(scopeUser),
  ]);

  const data = await getCalibration(where);
  const canApply = can(session?.user.role, "calibration.apply", "RW");

  // DEC-008 L5 (D8): applied-calibration history for the resolved crew, each flagged if a
  // contributing CR has since become ineligible. Immutable — never recomputed here.
  let crewId: string | null = null;
  if (teamFilter) {
    const team = await prisma.team.findUnique({ where: { id: teamFilter }, select: { crewId: true } });
    crewId = team?.crewId ?? null;
  }
  if (!crewId) {
    const locked = await lockedOrgPathForUser(session!.user.id, {
      activeGrantId: session!.user.activeGrantId,
      seatOrgUnitId: session!.user.seatOrgUnitId,
    });
    crewId = locked.crewId;
  }
  const runs = crewId ? await listCalibrationRuns(crewId) : [];

  return (
    <div className="space-y-6">
      <div>
        <p className="kicker">Learn → Recalibrate</p>
        <h1 className="font-display text-2xl font-semibold text-[var(--navy)]">Calibration</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Actual vs estimate → suggested Days/Point. Derived from Register Actual/Est ratios by Dev
          resource level (CRs with actuals) within the selected org scope.
        </p>
      </div>

      <ScopeFilterBar
        basePath="/calibration"
        units={orgFilter.units}
        teams={orgFilter.teams}
        lockedUnitIds={orgFilter.lockedUnitIds}
        lockedTeamId={orgFilter.lockedTeamId}
        org={org}
        team={teamFilter}
        showWorkRelease={false}
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
              <th>Actual/Est Ratio (effort-weighted)</th>
              <th>Suggested Days/Point</th>
              <th># Samples</th>
              <th>Consistency</th>
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
                <td>
                  {row.dispersionCv == null ? (
                    <span className="text-[var(--muted)]">—</span>
                  ) : row.lowConfidence ? (
                    <span className="chip-warn rounded px-1.5 py-0.5 text-xs">
                      CV {row.dispersionCv.toFixed(2)} · low confidence
                    </span>
                  ) : (
                    <span className="chip-ok rounded px-1.5 py-0.5 text-xs">
                      CV {row.dispersionCv.toFixed(2)}
                    </span>
                  )}
                </td>
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

      {runs.length > 0 ? (
        <section className="card p-5">
          <h2 className="font-medium text-[var(--navy)]">Applied calibration history</h2>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Past applied versions are immutable. A flagged version contains evidence that has since
            become ineligible (cancelled / descoped / re-baselined) — it is never recomputed; start a
            new calibration run if the impact warrants it.
          </p>
          <ul className="mt-3 space-y-2 text-sm">
            {runs.map((run) => (
              <li key={run.id} className="border-t border-[var(--line)] pt-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{run.configVersionId}</span>
                  <span className="text-[var(--muted)]">
                    {new Date(run.appliedAt).toLocaleDateString()} · {run.sampleCount} CR
                    {run.sampleCount === 1 ? "" : "s"} · {run.applied.length} level(s)
                  </span>
                  {run.containsIneligibleEvidence ? (
                    <span className="chip-warn rounded px-1.5 py-0.5 text-xs">
                      Contains subsequently ineligible evidence
                    </span>
                  ) : (
                    <span className="chip-ok rounded px-1.5 py-0.5 text-xs">Evidence intact</span>
                  )}
                </div>
                {run.affected.length > 0 ? (
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    Affected: {run.affected.map((a) => `${a.reference} (${a.reason})`).join(", ")}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
