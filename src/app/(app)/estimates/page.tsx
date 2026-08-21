import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { auth } from "@/auth";
import { StatusBadge } from "@/components/ui";
import { formatMoney } from "@/lib/utils";
import type { EstimateCalculationResult } from "@/domain/estimation/types";
import { can } from "@/lib/access";
import { estimateScope, fromSession } from "@/lib/scope";
import { getActiveConfig } from "@/services/configService";

export default async function EstimatesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; release?: string }>;
}) {
  const session = await auth();
  const { status, release } = await searchParams;
  const scope = estimateScope(fromSession(session!.user));
  const where = {
    ...scope,
    ...(status === "DRAFT"
      ? { status: { in: ["DRAFT", "RETURNED"] } }
      : status
        ? { status }
        : {}),
    ...(release ? { release } : {}),
  };
  const [estimates, config] = await Promise.all([
    prisma.estimate.findMany({
      where,
      include: { team: true },
      orderBy: { updatedAt: "desc" },
    }),
    getActiveConfig(),
  ]);
  const canCreate = can(session?.user.role, "estimates.create", "RW");
  const filters = [
    ["", "All estimates"],
    ["DRAFT", "Drafts"],
    ["READY_FOR_REVIEW", "Ready for review"],
    ["REVIEWED", "Reviewed"],
    ["APPROVED", "Approved"],
    ["COMPLETED", "Completed"],
  ];
  const current = status ?? "";
  const quarters = config.releaseQuarters ?? [];
  const releaseQuery = release ? `&release=${encodeURIComponent(release)}` : "";
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
      <div className="flex flex-wrap gap-2">
        {filters.map(([value, label]) => (
          <Link
            key={label}
            href={
              value
                ? `/estimates?status=${value}${releaseQuery}`
                : release
                  ? `/estimates?release=${encodeURIComponent(release)}`
                  : "/estimates"
            }
            className={`rounded-full px-3 py-1 text-sm ${
              current === value
                ? "bg-[var(--navy)] !text-white"
                : "bg-[var(--panel-2)] text-[var(--text)]"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>
      {quarters.length ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            Release
          </span>
          <Link
            href={status ? `/estimates?status=${status}` : "/estimates"}
            className={`rounded-full px-3 py-1 text-sm ${
              !release
                ? "bg-[var(--navy)] !text-white"
                : "bg-[var(--panel-2)] text-[var(--text)]"
            }`}
          >
            All quarters
          </Link>
          {quarters.map((q) => (
            <Link
              key={q}
              href={
                status
                  ? `/estimates?status=${status}&release=${encodeURIComponent(q)}`
                  : `/estimates?release=${encodeURIComponent(q)}`
              }
              className={`rounded-full px-3 py-1 text-sm ${
                release === q
                  ? "bg-[var(--navy)] !text-white"
                  : "bg-[var(--panel-2)] text-[var(--text)]"
              }`}
            >
              {q}
            </Link>
          ))}
        </div>
      ) : null}
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead className="bg-[var(--panel-2)] text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3">Reference</th>
              <th>Type</th>
              <th>Title</th>
              <th>Team</th>
              <th>Release</th>
              <th>T-shirt</th>
              <th>SP</th>
              <th>Flag</th>
              <th>AI-adj cost</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {estimates.length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-[var(--muted)]" colSpan={10}>
                  No estimates in this filter for this profile.
                </td>
              </tr>
            ) : (
              estimates.map((row) => {
                const result = parseResult(row.resultJson);
                const deferred = result?.costApplicability && result.costApplicability !== "OK";
                return (
                  <tr key={row.id} className="border-t border-[var(--line)]">
                    <td className="px-4 py-3">
                      <Link className="font-medium text-[var(--navy)] underline" href={`/estimates/${row.id}`}>
                        {row.reference}
                      </Link>
                    </td>
                    <td>{row.workItemType === "EPIC" ? "Epic" : "Issue"}</td>
                    <td>{row.title}</td>
                    <td>{row.team.name}</td>
                    <td>{row.release || "—"}</td>
                    <td className="font-semibold text-[var(--navy)]">{result?.effectiveTshirt ?? "—"}</td>
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
                        : formatMoney(result?.aiAdjustedDeliveryCost ?? null, result?.currency ?? row.currency)}
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
