import { getCalibration } from "@/services/portfolioService";
import { CalibrationActions } from "@/components/CalibrationActions";
import { ExplanationPanel } from "@/components/ui";
import { auth } from "@/auth";
import { can } from "@/lib/access";
import { fromSession, resolveEstimateScope } from "@/lib/scope";

export default async function CalibrationPage() {
  const session = await auth();
  const [data] = await Promise.all([
    getCalibration(await resolveEstimateScope(fromSession(session!.user))),
  ]);
  const canApply = can(session?.user.role, "calibration.apply", "RW");

  return (
    <div className="space-y-6">
      <div>
        <p className="kicker">Learn → Recalibrate</p>
        <h1 className="text-2xl font-semibold">Calibration</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Actual vs estimate → suggested Days/Point. Derived from the Register Actual/Est ratios by
          Dev resource level (CRs with actuals).
        </p>
      </div>

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
        <CalibrationActions rows={data.rows} />
      ) : (
        <p className="text-sm text-[var(--muted)]">
          Administrator approval is required to apply suggested Days/Point to configuration.
        </p>
      )}
    </div>
  );
}
