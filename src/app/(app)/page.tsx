import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { StatusBadge } from "@/components/ui";

export default async function DashboardPage() {
  const [total, drafts, pending, approved, completed] = await Promise.all([
    prisma.estimate.count(),
    prisma.estimate.count({ where: { status: "DRAFT" } }),
    prisma.estimate.count({ where: { status: { in: ["READY_FOR_REVIEW", "REVIEWED"] } } }),
    prisma.estimate.count({ where: { status: "APPROVED" } }),
    prisma.estimate.count({ where: { status: "COMPLETED" } }),
  ]);
  const recent = await prisma.estimate.findMany({
    include: { team: true },
    orderBy: { updatedAt: "desc" },
    take: 8,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-[var(--muted)]">
          Scope → Complexity → SP → Dev/QA → Capacity → Cost → Governance → Actuals
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-5">
        <Tile label="Estimates" value={total} />
        <Tile label="Drafts" value={drafts} />
        <Tile label="Pending review" value={pending} />
        <Tile label="Approved" value={approved} />
        <Tile label="Completed" value={completed} />
      </div>
      <div className="flex gap-3">
        <Link href="/estimates/new" className="rounded-lg bg-teal-400 px-4 py-2 text-slate-950">
          New estimate
        </Link>
        <Link href="/estimates" className="rounded-lg border border-[var(--line)] px-4 py-2">
          All estimates
        </Link>
      </div>
      <section className="card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--panel-2)] text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3">Reference</th>
              <th>Title</th>
              <th>Team</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {recent.map((row) => (
              <tr key={row.id} className="border-t border-[var(--line)]">
                <td className="px-4 py-3">
                  <Link className="text-teal-300" href={`/estimates/${row.id}`}>
                    {row.reference}
                  </Link>
                </td>
                <td>{row.title}</td>
                <td>{row.team.name}</td>
                <td>
                  <StatusBadge status={row.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function Tile({ label, value }: { label: string; value: number }) {
  return (
    <div className="card p-4">
      <p className="text-xs uppercase tracking-wide text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}
