import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { auth } from "@/auth";
import { StatusBadge, Release } from "@/components/ui";
import { ScopeFilterBar } from "@/components/ScopeFilterBar";
import { formatMoney } from "@/lib/utils";
import type { EstimateCalculationResult } from "@/domain/estimation/types";
import { DELIVERY_FLAGS } from "@/domain/estimation/portfolio";
import { T_SHIRTS } from "@/domain/estimation/types";
import { can } from "@/lib/access";
import { fromSession } from "@/lib/scope";
import { getOrgFilterData, resolveOrgSelectionWhere } from "@/lib/orgFilter";
import { getActiveConfig } from "@/services/configService";
import { releaseWhere } from "@/lib/releasePeriod";

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "DRAFT", label: "Drafts" },
  { value: "READY_FOR_REVIEW", label: "Ready for review" },
  { value: "REVIEWED", label: "Awaiting approval" },
  { value: "APPROVED", label: "Approved" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];

export default async function EstimatesPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    release?: string;
    team?: string;
    workItemType?: string;
    tshirt?: string;
    flag?: string;
    org?: string;
    page?: string;
  }>;
}) {
  const session = await auth();
  const {
    status = "",
    release = "",
    team = "",
    workItemType = "",
    tshirt = "",
    flag = "",
    org = "",
    page: pageParam = "",
  } = await searchParams;
  const scopeUser = fromSession(session!.user);
  const [orgWhere, orgFilter, config] = await Promise.all([
    resolveOrgSelectionWhere(scopeUser, org, team),
    getOrgFilterData(scopeUser),
    getActiveConfig(),
  ]);
  const where = {
    ...orgWhere,
    ...(status === "DRAFT"
      ? { status: { in: ["DRAFT", "RETURNED"] as string[] } }
      : status
        ? { status }
        : {}),
    ...releaseWhere(release),
    ...(workItemType ? { workItemType } : {}),
    ...(tshirt ? { effectiveTshirt: tshirt } : {}),
    ...(flag ? { deliveryFlag: flag } : {}),
  };
  const PAGE_SIZE = 50;
  const page = Math.max(1, Number(pageParam) || 1);
  const [total, estimates] = await Promise.all([
    prisma.estimate.count({ where }),
    prisma.estimate.findMany({
      where,
      include: { team: { include: { crew: true } } },
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);
  const canCreate = can(session?.user.role, "estimates.create", "RW");
  const quarters = config.releaseQuarters ?? [];
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const rows = estimates.map((row) => ({ row, result: parseResult(row.resultJson) }));

  // Preserve the active filters across pagination links.
  const pageQuery = (p: number) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries({ status, release, team, workItemType, tshirt, flag, org })) {
      if (v) params.set(k, v);
    }
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `/estimates?${qs}` : "/estimates";
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="kicker">Register</p>
          <h1 className="font-display text-2xl font-semibold text-[var(--navy)]">Estimates</h1>
        </div>
        {canCreate ? (
          <Link href="/estimates/new" className="btn-primary">
            New estimate
          </Link>
        ) : null}
      </div>

      <ScopeFilterBar
        basePath="/estimates"
        units={orgFilter.units}
        teams={orgFilter.teams}
        lockedUnitIds={orgFilter.lockedUnitIds}
        lockedTeamId={orgFilter.lockedTeamId}
        org={org}
        team={team}
        workItemType={workItemType}
        release={release}
        quarters={quarters}
        extraFilters={[
          { label: "T-shirt size", param: "tshirt", value: tshirt, options: [{ value: "", label: "All sizes" }, ...T_SHIRTS.map((s) => ({ value: s, label: s }))] },
          { label: "Delivery flag", param: "flag", value: flag, options: [{ value: "", label: "All flags" }, ...DELIVERY_FLAGS.map((f) => ({ value: f, label: f }))] },
          { label: "Status", param: "status", value: status, options: STATUS_OPTIONS },
        ]}
      />

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[960px] text-left text-sm [&_th]:px-3 [&_th]:py-3 [&_td]:px-3 [&_td]:py-3">
          <thead className="bg-[var(--panel-2)] text-[var(--muted)]">
            <tr>
              <th>Reference</th>
              <th>Type</th>
              <th>Title</th>
              <th>Crew</th>
              <th>Pod</th>
              <th>Release</th>
              <th>T-shirt</th>
              <th>SP</th>
              <th>Flag</th>
              <th>AI-adj cost</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className="text-[var(--muted)]" colSpan={11}>
                  No estimates in this filter for this profile.
                </td>
              </tr>
            ) : (
              rows.map(({ row, result }) => {
                const deferred = result?.costApplicability && result.costApplicability !== "OK";
                return (
                  <tr key={row.id} className="border-t border-[var(--line)]">
                    <td>
                      <Link
                        className="font-medium text-[var(--navy)] underline"
                        href={`/estimates/${row.id}`}
                      >
                        {row.reference}
                      </Link>
                    </td>
                    <td>{row.workItemType === "EPIC" ? "Epic" : "Issue"}</td>
                    <td>{row.title}</td>
                    <td>{row.team.crew?.name ?? "—"}</td>
                    <td>{row.team.name}</td>
                    <td><Release value={row.release} /></td>
                    <td className="font-semibold text-[var(--navy)]">
                      {result?.effectiveTshirt ?? "—"}
                    </td>
                    <td>{result?.selectedSp ?? "—"}</td>
                    <td>
                      {result ? (
                        <StatusBadge status={result.deliveryFlag ?? result.governanceDecision} />
                      ) : (
                        <span className="text-[var(--muted)]">Not calculated</span>
                      )}
                    </td>
                    <td>
                      {deferred
                        ? "Deferred"
                        : formatMoney(
                            result?.aiAdjustedDeliveryCost ?? null,
                            result?.currency ?? row.currency,
                          )}
                    </td>
                    <td>
                      <StatusBadge status={row.status} />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {total > PAGE_SIZE ? (
        <div className="flex items-center justify-between text-sm text-[var(--muted)]">
          <span>
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
          </span>
          <div className="flex items-center gap-2">
            {page > 1 ? (
              <Link href={pageQuery(page - 1)} className="btn-secondary text-sm">
                Previous
              </Link>
            ) : null}
            <span className="px-1">
              Page {page} / {totalPages}
            </span>
            {page < totalPages ? (
              <Link href={pageQuery(page + 1)} className="btn-secondary text-sm">
                Next
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function parseResult(json: string | null): EstimateCalculationResult | null {
  if (!json) return null;
  try {
    return JSON.parse(json) as EstimateCalculationResult;
  } catch {
    return null;
  }
}
