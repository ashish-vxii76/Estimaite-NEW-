import Link from "next/link";

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Analytics</h1>
        <p className="text-sm text-[var(--muted)]">
          Portfolio aggregates the CR register. Calibration learns from actuals without silently
          changing parameters.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Link href="/portfolio" className="card p-6 hover:border-teal-400">
          <p className="text-xs uppercase tracking-[0.2em] text-teal-300">Deliver</p>
          <h2 className="mt-2 text-xl font-semibold">Portfolio Roll-Up</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Totals, budget RAG, count by delivery flag, cost by T-shirt, and the CR register.
          </p>
        </Link>
        <Link href="/calibration" className="card p-6 hover:border-teal-400">
          <p className="text-xs uppercase tracking-[0.2em] text-teal-300">Measure → Learn</p>
          <h2 className="mt-2 text-xl font-semibold">Calibration</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Actual vs estimate ratios by Dev seniority, with suggested Days/Point for governed
            approval.
          </p>
        </Link>
      </div>
    </div>
  );
}
