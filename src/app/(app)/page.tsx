import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { HomeCharts } from "@/components/HomeCharts";
import { welcomeLine } from "@/lib/roles";

export default async function HomePage() {
  const session = await auth();
  const [total, drafts, pending, approved, completed, byTeamRows, byStatusRows] = await Promise.all([
    prisma.estimate.count(),
    prisma.estimate.count({ where: { status: { in: ["DRAFT", "RETURNED"] } } }),
    prisma.estimate.count({ where: { status: { in: ["READY_FOR_REVIEW", "REVIEWED"] } } }),
    prisma.estimate.count({ where: { status: "APPROVED" } }),
    prisma.estimate.count({ where: { status: "COMPLETED" } }),
    prisma.estimate.groupBy({
      by: ["teamId"],
      _count: { _all: true },
    }),
    prisma.estimate.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
  ]);

  const teams = await prisma.team.findMany({ select: { id: true, name: true } });
  const teamNames = Object.fromEntries(teams.map((t) => [t.id, t.name]));
  const byTeam = byTeamRows.map((row) => ({
    name: teamNames[row.teamId] ?? "Unknown",
    count: row._count._all,
  }));
  const statusLabels: Record<string, string> = {
    DRAFT: "Draft",
    RETURNED: "Returned",
    READY_FOR_REVIEW: "Ready for review",
    REVIEWED: "Reviewed",
    APPROVED: "Approved",
    REJECTED: "Rejected",
    COMPLETED: "Completed",
  };
  const byStatus = byStatusRows.map((row) => ({
    name: statusLabels[row.status] ?? row.status,
    count: row._count._all,
  }));

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-teal-300">Home</p>
        <h1 className="text-2xl font-semibold">
          {welcomeLine(session?.user.name, session?.user.role)}
        </h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Signed in as {session?.user.email}. Menus and actions follow this profile.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-5">
        <Tile label="Estimates" value={total} />
        <Tile label="Drafts" value={drafts} />
        <Tile label="In review" value={pending} />
        <Tile label="Approved" value={approved} />
        <Tile label="Completed" value={completed} />
      </div>
      <HomeCharts byStatus={byStatus} byTeam={byTeam} />
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
