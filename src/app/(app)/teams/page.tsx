import { prisma } from "@/lib/prisma";

export default async function TeamsPage() {
  const teams = await prisma.team.findMany({ include: { members: true }, orderBy: { name: "asc" } });
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold">Teams</h1>
      <div className="grid gap-4 md:grid-cols-2">
        {teams.map((team) => (
          <article key={team.id} className="card p-5">
            <h2 className="text-lg font-medium">{team.name}</h2>
            <p className="text-sm text-[var(--muted)]">
              {team.mappedLocation} · {team.currency} · team sprint {team.teamSprintRate} · resource
              sprint {team.resourceSprintRate}
            </p>
            <ul className="mt-3 text-sm">
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
