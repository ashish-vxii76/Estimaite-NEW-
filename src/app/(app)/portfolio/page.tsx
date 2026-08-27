import Link from "next/link";
import { getPortfolio } from "@/services/portfolioService";
import { PortfolioCharts } from "@/components/PortfolioCharts";
import { StatusBadge, Release } from "@/components/ui";
import { formatMoney } from "@/lib/utils";
import { DELIVERY_FLAGS, T_SHIRTS } from "@/domain/estimation";
import { auth } from "@/auth";
import { can } from "@/lib/access";
import { fromSession } from "@/lib/scope";
import { getOrgFilterData } from "@/lib/orgFilter";
import { getActiveConfig } from "@/services/configService";
import { yearsFromCatalogue } from "@/lib/releasePeriod";
import { descendantIds, resolveOrgCurrency } from "@/services/orgService";
import { OrgScopeFilters } from "@/components/OrgScopeFilters";

const RAG_CLASS: Record<string, string> = {
  UNSET: "bg-slate-100 text-slate-700",
  GREEN: "bg-emerald-50 text-emerald-800",
  AMBER: "bg-amber-50 text-amber-900",
  RED: "bg-rose-50 text-rose-800",
};

const BAR_CLASS: Record<string, string> = {
  UNSET: "bg-slate-400",
  GREEN: "bg-emerald-500",
  AMBER: "bg-amber-500",
  RED: "bg-rose-500",
};

export default async function PortfolioPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; org?: string; team?: string }>;
}) {
  const session = await auth();
  const { year: yearParam = "", org = "", team = "" } = await searchParams;
  const scopeUser = fromSession(session!.user);
  const [orgFilter, config] = await Promise.all([
    getOrgFilterData(scopeUser),
    getActiveConfig(),
  ]);
  // Single source of truth: budget/release years come from the configured Release-quarters
  // catalogue — the same source the estimate views use. Default to the current calendar year
  // if it's configured, else the latest configured year.
  const catalogueYears = yearsFromCatalogue(config.releaseQuarters ?? []).map(Number);
  const calYear = new Date().getFullYear();
  const year =
    Number(yearParam) || (catalogueYears.includes(calYear) ? calYear : catalogueYears[0] ?? calYear);
  const yearOptions = Array.from(new Set([...catalogueYears, year])).sort((a, b) => a - b);

  // Resolve the org-cascade selection to the crews it implies (budgets live at crew level).
  let selectionCrewIds: string[] | null = null;
  if (team) {
    const t = orgFilter.teams.find((x) => x.id === team);
    selectionCrewIds = t?.crewId ? [t.crewId] : [];
  } else if (org) {
    const sub = new Set(await descendantIds(org));
    selectionCrewIds = orgFilter.units.filter((u) => u.type === "CREW" && sub.has(u.id)).map((u) => u.id);
  }

  const displayCurrency = await resolveOrgCurrency({
    orgUnitId: org || null,
    crewIds: selectionCrewIds,
  });
  const data = await getPortfolio({
    user: scopeUser,
    year,
    crewIds: selectionCrewIds,
    teamId: team || null,
    currency: displayCurrency,
  });
  const currency = data.currency;
  const canCreate = can(session?.user.role, "estimates.create", "RW");
  const canBudget =
    can(session?.user.role, "org.budget") || can(session?.user.role, "portfolio.budget");


  return (
    <div className="space-y-6">
      <div>
        <p className="kicker">Register</p>
        <h1 className="font-display text-2xl font-semibold text-[var(--navy)]">Roll-up & CR register</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Costs roll up from Pod → Crew → Stream → Sub-division → Division → Company. Budget is yearly
          CHF at Crew; Budget year matches Release year. Both baseline and AI-adjusted totals are shown.
        </p>
      </div>

      <section className="card space-y-4 p-5">
        <div>
          <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Budget / release year</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {yearOptions.map((y) => (
              <Link
                key={y}
                href={`/portfolio?year=${y}${org ? `&org=${org}` : ""}${team ? `&team=${team}` : ""}`}
                className={`rounded-lg border px-3 py-2 text-sm text-[var(--navy)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)] ${
                  y === year
                    ? "border-[var(--gold)] bg-[var(--gold-soft)] font-semibold"
                    : "border-[var(--line)] bg-[var(--panel-2)] font-normal"
                }`}
              >
                {y}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <OrgScopeFilters
        basePath="/portfolio"
        units={orgFilter.units}
        teams={orgFilter.teams}
        lockedUnitIds={orgFilter.lockedUnitIds}
        org={org}
        team={team}
        showWorkRelease={false}
        extraParams={{ year: String(year) }}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Tile label={`Estimates (${year})`} value={String(data.totalEstimates)} />
        <Tile label="Pipeline AI-adjusted (CHF)" value={formatMoney(data.totalAiAdjustedCost, currency)} />
        <Tile label="Pipeline baseline (CHF)" value={formatMoney(data.totalBaselineCost, currency)} />
        <Tile label="Total effort (PD)" value={data.totalEffortPd.toLocaleString()} />
      </div>

      <BudgetUtilisation u={data.budgetUtilisation} year={year} currency={currency} />

      <section id="budget" className="card scroll-mt-6 space-y-3 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-medium text-[var(--navy)]">Crew yearly budgets ({year})</h2>
            <p className="text-sm text-[var(--muted)]">
              Budgets are set per Crew in CHF. Higher org levels roll up as the sum of Crews.
            </p>
          </div>
          {canBudget ? (
            <Link href="/admin/crew-budgets" className="btn-primary text-sm">
              Manage Crew budgets
            </Link>
          ) : null}
        </div>
        {data.crewBudgets.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No Crew budgets for {year} yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="text-[var(--muted)]">
                <tr>
                  <th className="py-2 text-left">Crew</th>
                  <th className="py-2 text-right">Budget</th>
                  <th className="py-2 text-right">Utilised (committed)</th>
                  <th className="py-2 text-right">Remaining</th>
                  <th className="py-2 pl-4 text-left">Utilisation</th>
                </tr>
              </thead>
              <tbody>
                {data.crewBudgets.map((row) => {
                  const pct = Math.round((row.utilisationPct ?? 0) * 100);
                  return (
                    <tr key={row.crewId} className="border-t border-[var(--line)]">
                      <td className="py-2">{row.crewName}</td>
                      <td className="py-2 text-right tabular-nums">{formatMoney(row.amount, row.currency)}</td>
                      <td className="py-2 text-right tabular-nums">{formatMoney(row.utilised, row.currency)}</td>
                      <td className={`py-2 text-right tabular-nums ${row.remaining < 0 ? "text-[var(--danger)]" : ""}`}>
                        {formatMoney(row.remaining, row.currency)}
                      </td>
                      <td className="py-2 pl-4">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-24 overflow-hidden rounded-full bg-[var(--panel-2)]">
                            <div
                              className={`h-full ${BAR_CLASS[row.rag] ?? BAR_CLASS.UNSET}`}
                              style={{ width: `${Math.min(100, pct)}%` }}
                            />
                          </div>
                          <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${RAG_CLASS[row.rag] ?? ""}`}>
                            {row.utilisationPct != null ? `${pct}%` : row.rag}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                <tr className="border-t border-[var(--line)] font-medium">
                  <td className="py-2">Total</td>
                  <td className="py-2 text-right tabular-nums">{formatMoney(data.budget ?? 0, currency)}</td>
                  <td className="py-2 text-right tabular-nums">
                    {formatMoney(data.budgetUtilisation.utilizedAiCost, currency)}
                  </td>
                  <td className="py-2 text-right tabular-nums">
                    {formatMoney(data.budgetUtilisation.remaining, currency)}
                  </td>
                  <td className="py-2 pl-4" />
                </tr>
              </tbody>
            </table>
          </div>
        )}
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
          <h2 className="font-medium">CR Register ({year})</h2>
          <div className="flex items-center gap-3">
            <a
              href={`/api/portfolio/export?year=${year}${org ? `&org=${org}` : ""}${team ? `&team=${team}` : ""}`}
              download
              className="text-sm font-medium text-[var(--navy)] underline"
            >
              Export CSV
            </a>
            {canCreate ? (
              <Link href="/estimates/new" className="text-sm font-medium text-[var(--navy)] underline">
                New estimate
              </Link>
            ) : null}
          </div>
        </div>
        <table className="w-full min-w-[1100px] text-left text-sm">
          <thead className="bg-[var(--panel-2)] text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3">CR</th>
              <th>Title</th>
              <th>Crew</th>
              <th>Pod</th>
              <th>Programme</th>
              <th>Project</th>
              <th>Release</th>
              <th>T-Shirt</th>
              <th>Delivery flag</th>
              <th>Baseline</th>
              <th>AI-adj</th>
            </tr>
          </thead>
          <tbody>
            {data.register.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-[var(--muted)]" colSpan={11}>
                  No CRs with release year {year} in scope.
                </td>
              </tr>
            ) : (
              data.register.slice(0, 200).map((row) => (
                <tr key={row.id} className="border-t border-[var(--line)]">
                  <td className="px-4 py-3">
                    <Link className="font-medium text-[var(--navy)] underline" href={`/estimates/${row.id}`}>
                      {row.reference}
                    </Link>
                  </td>
                  <td>{row.title}</td>
                  <td>{row.crew}</td>
                  <td>{row.team}</td>
                  <td>{row.programme || "—"}</td>
                  <td>{row.project || "—"}</td>
                  <td><Release value={row.release} /></td>
                  <td>{row.effectiveTshirt}</td>
                  <td>
                    <StatusBadge status={row.deliveryFlag ?? row.governanceDecision} />
                  </td>
                  <td>{formatMoney(row.baselineDeliveryCost, row.currency)}</td>
                  <td>{formatMoney(row.aiAdjustedDeliveryCost, row.currency)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {data.register.length > 200 ? (
          <p className="px-4 py-3 text-xs text-[var(--muted)]">
            Showing the first 200 of {data.register.length} CRs. Totals above cover all {year} CRs
            in scope.
          </p>
        ) : null}
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

type BudgetUtil = {
  budget: number | null;
  utilizedAiCost: number;
  utilizedBaselineCost: number;
  forecastAiCost: number;
  projectedAiCost: number;
  remaining: number | null;
  utilizationPct: number | null;
  variance: number | null;
  utilizedRag: string;
  utilizedLabel: string;
  projectedRag: string;
  committedCount: number;
  pipelineCount: number;
};

function BudgetUtilisation({ u, year, currency }: { u: BudgetUtil; year: number; currency: string }) {
  const money = (n: number | null) => (n == null ? "—" : formatMoney(n, currency));
  const overspent = u.remaining != null && u.remaining < 0;
  return (
    <section className="card space-y-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold text-[var(--navy)]">
            Budget vs utilisation · {year}
          </h2>
          <p className="text-sm text-[var(--muted)]">
            Utilised = committed CRs (Approved + Completed), AI-adjusted. Rolls up quarter → year and
            sums Crews up the org tree.
          </p>
        </div>
        <span className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${RAG_CLASS[u.utilizedRag] ?? ""}`}>
          {u.utilizedLabel}
        </span>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-[var(--line)] bg-[var(--panel-2)] p-4">
          <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Crew budget</p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-[var(--navy)]">
            {u.budget != null ? money(u.budget) : "Not set"}
          </p>
        </div>
        <div className="rounded-xl border border-[var(--line)] bg-[var(--panel-2)] p-4">
          <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Utilised (committed)</p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-[var(--navy)]">{money(u.utilizedAiCost)}</p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            {u.committedCount} CR{u.committedCount === 1 ? "" : "s"} · baseline {money(u.utilizedBaselineCost)}
          </p>
        </div>
        <div className="rounded-xl border border-[var(--line)] bg-[var(--panel-2)] p-4">
          <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Remaining</p>
          <p className={`mt-1 text-xl font-semibold tabular-nums ${overspent ? "text-[var(--danger)]" : "text-[var(--navy)]"}`}>
            {money(u.remaining)}
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            {u.utilizationPct != null ? `${Math.round(u.utilizationPct * 100)}% used` : "set a budget"}
          </p>
        </div>
        <div className="rounded-xl border border-[var(--line)] bg-[var(--panel-2)] p-4">
          <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Projected (incl. pipeline)</p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-[var(--navy)]">{money(u.projectedAiCost)}</p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            +{u.pipelineCount} in-pipeline ({money(u.forecastAiCost)}) ·{" "}
            <span className={`rounded px-1.5 py-0.5 font-medium ${RAG_CLASS[u.projectedRag] ?? ""}`}>{u.projectedRag}</span>
          </p>
        </div>
      </div>
    </section>
  );
}
