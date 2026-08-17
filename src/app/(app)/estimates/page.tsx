import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { StatusBadge } from "@/components/ui";
import { formatMoney } from "@/lib/utils";
import type { EstimateCalculationResult } from "@/domain/estimation/types";

export default async function EstimatesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const where =
    status === "DRAFT"
      ? { status: { in: ["DRAFT", "RETURNED"] } }
      : status
        ? { status }
        : undefined;
  const estimates = await prisma.estimate.findMany({
    where,
    include: { team: true },
    orderBy: { updatedAt: "desc" },
  });
  const filters = [
    ["", "All estimates"],
    ["DRAFT", "Drafts"],
    ["READY_FOR_REVIEW", "Ready for review"],
    ["REVIEWED", "Reviewed"],
    ["APPROVED", "Approved"],
    ["COMPLETED", "Completed"],
  ];
  const current = status ?? "";
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="kicker">Register</p>
          <h1 className="font-display text-2xl font-semibold text-[var(--navy)]">Estimates</h1>
        </div>
        <Link href="/estimates/new" className="btn-primary">
          New estimate
        </Link>
      </div>
      <div className="flex flex-wrap gap-2">
        {filters.map(([value, label]) => (
          <Link
            key={label}
            href={value ? `/estimates?status=${value}` : "/estimates"}
            className={`rounded-full px-3 py-1 text-sm ${
              current === value ? "bg-[var(--navy)] text-white" : "bg-[var(--panel-2)]"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead className="bg-[var(--panel-2)] text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3">Reference</th>
              <th>Type</th>
              <th>Title</th>
              <th>Team</th>
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
                <td className="px-4 py-8 text-[var(--muted)]" colSpan={9}>
                  No estimates in this filter. Seed the demo register with{" "}
                  <code>npm run db:seed</code> or create a new estimate.
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
