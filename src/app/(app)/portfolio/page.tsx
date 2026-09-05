import Link from "next/link";
import { getPortfolio } from "@/services/portfolioService";
import { PortfolioCharts } from "@/components/PortfolioCharts";
import { StatusBadge, Release } from "@/components/ui";
import { formatMoney } from "@/lib/utils";
import { auth } from "@/auth";
import { can } from "@/lib/access";
import { fromSession } from "@/lib/scope";
import { getOrgFilterData } from "@/lib/orgFilter";
import { getActiveConfig } from "@/services/configService";
import { yearsFromCatalogue } from "@/lib/releasePeriod";
import { descendantIds, resolveOrgCurrency } from "@/services/orgService";
import { listDivergedCrews, listPdIncomparableCrews } from "@/services/crewMappingService";
import { ScopeFilterBar } from "@/components/ScopeFilterBar";
import { RollupCharts } from "@/components/RollupCharts";

const RAG_CLASS: Record<string, string> = {
  UNSET: "chip-neutral",
  GREEN: "chip-ok",
  AMBER: "chip-warn",
  RED: "chip-bad",
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
  const defaultYear = catalogueYears.includes(calYear) ? calYear : catalogueYears[0] ?? calYear;
  // `year=all` → whole dataset (all years); no/blank param → default year; else the selected year.
  const allYears = yearParam === "all";
  const year: number | null = allYears ? null : Number(yearParam) || defaultYear;
  const yearLabel = year == null ? "All years" : String(year);
  const yearOptions = Array.from(
    new Set([...catalogueYears, ...(year != null ? [year] : [])]),
  ).sort((a, b) => a - b);

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
  // DEC-011 M5: warn when the rolled-up crews include any on crew-specific mappings — their story
  // points aren't comparable, so cross-crew SP totals mislead (compare in person-days, DEC-010).
  const scopeCrewIds =
    selectionCrewIds ?? orgFilter.units.filter((u) => u.type === "CREW").map((u) => u.id);
  const divergedCrews = await listDivergedCrews(scopeCrewIds);
  // DEC-014: crews that broke person-days comparability (Tier-3 config override) — shown distinctly.
  const pdIncomparable = await listPdIncomparableCrews(scopeCrewIds);
  const pdIncomparableIds = new Set(pdIncomparable.map((c) => c.crewId));
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

      <ScopeFilterBar
        basePath="/portfolio"
        units={orgFilter.units}
        teams={orgFilter.teams}
        lockedUnitIds={orgFilter.lockedUnitIds}
        lockedTeamId={orgFilter.lockedTeamId}
        org={org}
        team={team}
        showWorkRelease={false}
        extraFilters={[
          {
            label: "Budget year",
            param: "year",
            value: allYears ? "all" : String(year),
            clearValue: "all", // removing the year chip → all years (whole dataset)
            options: [
              { value: "all", label: "All years" },
              ...yearOptions.map((y) => ({ value: String(y), label: String(y) })),
            ],
          },
        ]}
      />

      {pdIncomparable.length > 0 ? (
        <div className="rounded-xl border border-[var(--danger)] bg-[var(--bg-danger,rgba(220,50,50,.08))] px-4 py-3 text-sm text-[var(--danger)]">
          <span className="font-semibold">Not comparable even in person-days.</span>{" "}
          {pdIncomparable.map((c) => c.crewName).join(", ")}{" "}
          {pdIncomparable.length === 1 ? "has" : "have"} a Tier-3 estimation-config override (complexity
          multipliers or calibration floor) — the effort scale itself differs, so these crews&apos; totals
          must not be pooled with others&apos; and their calibration is advisory-only (DEC-014).
        </div>
      ) : null}
      {divergedCrews.filter((c) => !pdIncomparableIds.has(c.crewId)).length > 0 ? (
        (() => {
          const rest = divergedCrews.filter((c) => !pdIncomparableIds.has(c.crewId));
          return (
            <div className="rounded-xl border border-[var(--line)] bg-[var(--panel-2)] px-4 py-3 text-sm text-[var(--navy)]">
              <span className="font-medium">Story-point and cost totals across crews aren&apos;t directly comparable.</span>{" "}
              {rest.length === 1
                ? `1 crew uses crew-specific config (${rest[0].crewName}).`
                : `${rest.length} crews use crew-specific config (${rest.map((c) => c.crewName).join(", ")}).`}{" "}
              Compare across crews in person-days, and treat cross-crew cost totals as scope-dependent.
            </div>
          );
        })()
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Tile label={`Estimates (${yearLabel})`} value={String(data.totalEstimates)} />
        <Tile label="Pipeline AI-adjusted (CHF)" value={formatMoney(data.totalAiAdjustedCost, currency)} />
        <Tile label="Pipeline baseline (CHF)" value={formatMoney(data.totalBaselineCost, currency)} />
        <Tile label="Total effort (PD)" value={data.totalEffortPd.toLocaleString()} />
      </div>

      <BudgetUtilisation u={data.budgetUtilisation} year={year} currency={currency} />

      {data.deliveryVariance.sampleCount > 0 ? (
        (() => {
          const dv = data.deliveryVariance;
          const over = dv.variancePd > 0;
          const tone = dv.variancePd === 0 ? "text-[var(--navy)]" : over ? "text-[var(--warn)]" : "text-[var(--ok)]";
          const box = "rounded-xl border border-[var(--line)] bg-[var(--panel-2)] p-4";
          return (
            <section className="card space-y-4 p-5">
              <div>
                <h2 className="font-display text-lg font-semibold text-[var(--navy)]">
                  Delivery variance · {yearLabel}
                </h2>
                <p className="text-sm text-[var(--muted)]">
                  Actual vs estimated effort for {dv.sampleCount} completed CR
                  {dv.sampleCount === 1 ? "" : "s"} with actuals. Positive = delivered over estimate.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className={box}>
                  <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Estimated effort</p>
                  <p className="mt-1 text-xl font-semibold tabular-nums text-[var(--navy)]">
                    {dv.estimatedEffortPd.toLocaleString()} PD
                  </p>
                </div>
                <div className={box}>
                  <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Actual effort</p>
                  <p className="mt-1 text-xl font-semibold tabular-nums text-[var(--navy)]">
                    {dv.actualEffortPd.toLocaleString()} PD
                  </p>
                </div>
                <div className={box}>
                  <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Variance</p>
                  <p className={`mt-1 text-xl font-semibold tabular-nums ${tone}`}>
                    {over ? "+" : ""}
                    {dv.variancePd.toLocaleString()} PD
                  </p>
                </div>
                <div className={box}>
                  <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Variance %</p>
                  <p className={`mt-1 text-xl font-semibold tabular-nums ${tone}`}>
                    {dv.variancePct == null ? "—" : `${over ? "+" : ""}${(dv.variancePct * 100).toFixed(1)}%`}
                  </p>
                </div>
              </div>
            </section>
          );
        })()
      ) : null}

      <RollupCharts
        currency={currency}
        budget={data.budgetUtilisation.budget}
        utilised={data.budgetUtilisation.utilizedAiCost}
        projected={data.budgetUtilisation.projectedAiCost}
        forecast={data.budgetUtilisation.forecastAiCost}
        burnUp={data.burnUp}
        baseline={data.totalBaselineCost}
        aiAdjusted={data.totalAiAdjustedCost}
        variance={{
          sampleCount: data.deliveryVariance.sampleCount,
          variancePct: data.deliveryVariance.variancePct,
          byCrew: data.deliveryVariance.byCrew,
        }}
        costByCrew={data.costByCrew}
      />

      <section id="budget" className="card scroll-mt-6 space-y-3 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-medium text-[var(--navy)]">Crew yearly budgets ({yearLabel})</h2>
            <p className="text-sm text-[var(--muted)]">
              Budgets are set per Crew in CHF. Higher org levels roll up as the sum of Crews.
            </p>
          </div>
          {canBudget ? (
            <Link href="/crew-budgets" className="btn-primary text-sm">
              Manage Crew budgets
            </Link>
          ) : null}
        </div>
        {data.crewBudgets.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">
            {allYears ? "No Crew budgets yet." : `No Crew budgets for ${year} yet.`}
          </p>
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

      <PortfolioCharts
        countByFlag={data.countByFlag}
        costByTshirt={data.costByTshirt}
        currency={currency}
        sampleCount={data.totalEstimates}
        minSamples={5}
      />

      <section className="card overflow-x-auto">
        <div className="flex items-center justify-between px-5 py-4">
          <h2 className="font-medium">CR Register ({yearLabel})</h2>
          <div className="flex items-center gap-3">
            <a
              href={`/api/portfolio/export?year=${allYears ? "all" : year}${org ? `&org=${org}` : ""}${team ? `&team=${team}` : ""}`}
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
                  {allYears ? "No CRs in scope." : `No CRs with release year ${year} in scope.`}
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

function BudgetUtilisation({ u, year, currency }: { u: BudgetUtil; year: number | null; currency: string }) {
  const money = (n: number | null) => (n == null ? "—" : formatMoney(n, currency));
  const overspent = u.remaining != null && u.remaining < 0;
  return (
    <section className="card space-y-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold text-[var(--navy)]">
            Budget vs utilisation · {year ?? "All years"}
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
