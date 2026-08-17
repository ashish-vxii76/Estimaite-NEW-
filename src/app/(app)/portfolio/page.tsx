import Link from "next/link";
import { getPortfolio } from "@/services/portfolioService";
import { BudgetForm } from "@/components/BudgetForm";
import { PortfolioCharts } from "@/components/PortfolioCharts";
import { StatusBadge } from "@/components/ui";
import { formatMoney } from "@/lib/utils";
import { DELIVERY_FLAGS, T_SHIRTS } from "@/domain/estimation";

const RAG_CLASS: Record<string, string> = {
  UNSET: "bg-slate-500/20 text-slate-200",
  GREEN: "bg-emerald-500/20 text-emerald-300",
  AMBER: "bg-amber-500/20 text-amber-200",
  RED: "bg-rose-500/20 text-rose-300",
};

export default async function PortfolioPage() {
  const data = await getPortfolio();
  const currency = data.currency;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-teal-300">Register</p>
        <h1 className="text-2xl font-semibold">Portfolio Roll-Up</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Aggregates every calculated CR in the Register. Budget status is RAG against the entered
          portfolio budget.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Tile label="Total Estimates" value={String(data.totalEstimates)} />
        <Tile label="Total AI-Adjusted Cost" value={formatMoney(data.totalAiAdjustedCost, currency)} />
        <Tile label="Total Baseline Cost" value={formatMoney(data.totalBaselineCost, currency)} />
        <Tile label="Total Effort (PD)" value={data.totalEffortPd.toLocaleString()} />
        <div className="card p-4">
          <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Budget Status (RAG)</p>
          <p className={`mt-2 inline-flex rounded-full px-3 py-1 text-sm font-medium ${RAG_CLASS[data.budgetRag]}`}>
            {data.budgetLabel}
          </p>
          <p className="mt-2 text-xs text-[var(--muted)]">
            {data.budget != null ? formatMoney(data.budget, currency) : "No budget entered"}
          </p>
        </div>
      </div>

      <section className="card p-5">
        <BudgetForm budget={data.budget} currency={currency} />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card overflow-hidden">
          <h2 className="px-5 pt-4 font-medium">Count by Delivery Flag</h2>
          <table className="mt-2 w-full text-sm">
            <tbody>
              {DELIVERY_FLAGS.map((flag) => (
                <tr key={flag} className="border-t border-[var(--line)]">
                  <td className="px-5 py-2">
                    <StatusBadge status={flag} />
                  </td>
                  <td className="px-5 py-2 text-right">{data.countByFlag[flag] ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <section className="card overflow-hidden">
          <h2 className="px-5 pt-4 font-medium">Cost by T-Shirt (AI-adj)</h2>
          <table className="mt-2 w-full text-sm">
            <tbody>
              {T_SHIRTS.map((tshirt) => (
                <tr key={tshirt} className="border-t border-[var(--line)]">
                  <td className="px-5 py-2">{tshirt}</td>
                  <td className="px-5 py-2 text-right">
                    {formatMoney(data.costByTshirt[tshirt] ?? 0, currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>

      <PortfolioCharts
        countByFlag={data.countByFlag}
        costByTshirt={data.costByTshirt}
        currency={currency}
        sampleCount={data.totalEstimates}
        minSamples={5}
      />

      <section className="card overflow-x-auto">
        <div className="flex items-center justify-between px-5 py-4">
          <h2 className="font-medium">CR Register</h2>
          <Link href="/estimates/new" className="text-sm text-teal-300">
            New estimate
          </Link>
        </div>
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="bg-[var(--panel-2)] text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3">CR</th>
              <th>Title</th>
              <th>Team</th>
              <th>T-Shirt</th>
              <th>SP</th>
              <th>Delivery flag</th>
              <th>Baseline</th>
              <th>AI-adj</th>
              <th>Effort PD</th>
            </tr>
          </thead>
          <tbody>
            {data.register.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-[var(--muted)]" colSpan={9}>
                  No CRs in the register yet. Create an estimate to populate the roll-up.
                </td>
              </tr>
            ) : (
              data.register.map((row) => (
                <tr key={row.id} className="border-t border-[var(--line)]">
                  <td className="px-4 py-3">
                    <Link className="text-teal-300" href={`/estimates/${row.id}`}>
                      {row.reference}
                    </Link>
                  </td>
                  <td>{row.title}</td>
                  <td>{row.team}</td>
                  <td>{row.effectiveTshirt}</td>
                  <td>{row.selectedSp ?? "—"}</td>
                  <td>
                    <StatusBadge status={row.deliveryFlag ?? row.governanceDecision} />
                  </td>
                  <td>{formatMoney(row.baselineDeliveryCost, row.currency)}</td>
                  <td>{formatMoney(row.aiAdjustedDeliveryCost, row.currency)}</td>
                  <td>{row.adjustedTotalEffortPd || "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs uppercase tracking-wide text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}
