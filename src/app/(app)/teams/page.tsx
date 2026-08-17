import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { auth } from "@/auth";
import { formatMoney } from "@/lib/utils";

export default async function TeamsPage() {
  const [teams, session] = await Promise.all([
    prisma.team.findMany({
      include: { members: true, _count: { select: { estimates: true } } },
      orderBy: { name: "asc" },
    }),
    auth(),
  ]);
  const canCreate = session?.user.role === "ADMINISTRATOR";
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="kicker">Organisation</p>
          <h1 className="font-display text-2xl font-semibold text-[var(--navy)]">Teams</h1>
        </div>
        {canCreate ? (
          <Link href="/teams/new" className="btn-primary">
            New team
          </Link>
        ) : null}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {teams.map((team) => (
          <article key={team.id} className="card p-5">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-lg font-medium text-[var(--navy)]">{team.name}</h2>
              <span className="rounded-full bg-[var(--panel-2)] px-2 py-0.5 text-xs text-[var(--muted)]">
                {team._count.estimates} estimates
              </span>
            </div>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {team.mappedLocation} · {team.currency}
            </p>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <div>
                <dt className="text-xs text-[var(--muted)]">Team sprint</dt>
                <dd className="font-medium">{formatMoney(team.teamSprintRate, team.currency)}</dd>
              </div>
              <div>
                <dt className="text-xs text-[var(--muted)]">Resource sprint</dt>
                <dd className="font-medium">{formatMoney(team.resourceSprintRate, team.currency)}</dd>
              </div>
            </dl>
            <ul className="mt-3 space-y-1 text-sm">
              {team.members.map((m) => (
                <li key={m.id}>
                  {m.name} — {m.roleStream} / {m.resourceLevel} / {m.location}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </div>
  );
}
