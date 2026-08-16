import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { StatusBadge } from "@/components/ui";

export default async function EstimatesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const estimates = await prisma.estimate.findMany({
    where: status ? { status } : undefined,
    include: { team: true },
    orderBy: { updatedAt: "desc" },
  });
  const filters = [
    ["", "All"],
    ["DRAFT", "Drafts"],
    ["READY_FOR_REVIEW", "Pending review"],
    ["APPROVED", "Approved"],
    ["COMPLETED", "Completed"],
  ];
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Estimates</h1>
        <Link href="/estimates/new" className="rounded-lg bg-teal-400 px-4 py-2 text-slate-950">
          New estimate
        </Link>
      </div>
      <div className="flex flex-wrap gap-2">
        {filters.map(([value, label]) => (
          <Link
            key={label}
            href={value ? `/estimates?status=${value}` : "/estimates"}
            className="rounded-full bg-[var(--panel-2)] px-3 py-1 text-sm"
          >
            {label}
          </Link>
        ))}
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--panel-2)] text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3">Reference</th>
              <th>Type</th>
              <th>Title</th>
              <th>Team</th>
              <th>Status</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
            {estimates.map((row) => (
              <tr key={row.id} className="border-t border-[var(--line)]">
                <td className="px-4 py-3">
                  <Link className="text-teal-300" href={`/estimates/${row.id}`}>
                    {row.reference}
                  </Link>
                </td>
                <td>{row.workItemType}</td>
                <td>{row.title}</td>
                <td>{row.team.name}</td>
                <td>
                  <StatusBadge status={row.status} />
                </td>
                <td>{row.updatedAt.toISOString().slice(0, 10)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
