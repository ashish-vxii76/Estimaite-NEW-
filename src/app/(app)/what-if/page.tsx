import { WhatIfForm } from "@/components/WhatIfForm";
import { OrgCrewTeamFilters } from "@/components/OrgCrewTeamFilters";
import { toScenarioTeams } from "@/lib/scenarioTeams";
import { auth } from "@/auth";
import { fromSession, teamsForUser } from "@/lib/scope";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function WhatIfPage({
  searchParams,
}: {
  searchParams: Promise<{ crew?: string; team?: string }>;
}) {
  const session = await auth();
  const { crew: crewFilter = "", team: teamFilter = "" } = await searchParams;
  const [teams, locations, crews] = await Promise.all([
    teamsForUser(fromSession(session!.user)),
    prisma.location.findMany({ where: { active: true } }),
    prisma.orgUnit.findMany({
      where: { type: "CREW", active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  let filtered = teams;
  if (crewFilter) filtered = filtered.filter((t) => t.crewId === crewFilter);
  if (teamFilter) filtered = filtered.filter((t) => t.id === teamFilter);

  return (
    <div className="space-y-4">
      <p className="kicker">Scenario</p>
      <h1 className="font-display text-2xl font-semibold text-[var(--navy)]">What-If (standalone)</h1>
      <p className="text-sm text-[var(--muted)]">
        Generic sandbox against your roster. Prefer the{" "}
        <strong className="font-semibold text-[var(--navy)]">Scenarios</strong> tab on a submitted
        estimate for CR-specific analysis (selected-team mix, cross-team table, sensitivity
        recommendation). Scenarios never modify an approved estimate.
      </p>
      <p className="text-sm text-[var(--muted)]">
        <Link href="/estimates?status=READY_FOR_REVIEW" className="underline">
          Open estimates ready for review
        </Link>{" "}
        and use Scenarios there when you have a governed pack.
      </p>

      <OrgCrewTeamFilters
        basePath="/what-if"
        crews={crews}
        teams={(crewFilter ? teams.filter((t) => t.crewId === crewFilter) : teams).map((t) => ({
          id: t.id,
          name: t.name,
        }))}
        crew={crewFilter}
        team={teamFilter}
      />

      {filtered.length === 0 ? (
        <p className="card p-5 text-sm text-[var(--muted)]">
          No pods in this Crew / Pod filter. Clear the filters or attach pods under a Crew in
          Organisation setup.
        </p>
      ) : (
        <WhatIfForm teams={toScenarioTeams(filtered, locations)} mode="standalone" />
      )}
    </div>
  );
}
