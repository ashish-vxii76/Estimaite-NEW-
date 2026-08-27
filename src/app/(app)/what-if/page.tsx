import { WhatIfForm } from "@/components/WhatIfForm";
import { OrgScopeFilters } from "@/components/OrgScopeFilters";
import { toScenarioTeams } from "@/lib/scenarioTeams";
import { auth } from "@/auth";
import { fromSession, teamsForUser } from "@/lib/scope";
import { getOrgFilterData } from "@/lib/orgFilter";
import { descendantIds } from "@/services/orgService";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function WhatIfPage({
  searchParams,
}: {
  searchParams: Promise<{ team?: string; org?: string }>;
}) {
  const session = await auth();
  const { team: teamFilter = "", org = "" } = await searchParams;
  const scopeUser = fromSession(session!.user);
  const [teams, locations, orgFilter] = await Promise.all([
    teamsForUser(scopeUser),
    prisma.location.findMany({ where: { active: true } }),
    getOrgFilterData(scopeUser),
  ]);

  // Narrow the roster pods to the org-cascade selection (within the user's scope).
  let selectedTeams = teams;
  if (teamFilter) {
    selectedTeams = teams.filter((t) => t.id === teamFilter);
  } else if (org) {
    const sub = new Set(await descendantIds(org));
    const crewIds = new Set(
      orgFilter.units.filter((u) => u.type === "CREW" && sub.has(u.id)).map((u) => u.id),
    );
    selectedTeams = teams.filter((t) => t.crewId && crewIds.has(t.crewId));
  }

  return (
    <div className="space-y-4">
      <p className="kicker">Scenario</p>
      <h1 className="font-display text-2xl font-semibold text-[var(--navy)]">What-If (standalone)</h1>
      <p className="text-sm text-[var(--muted)]">
        Generic sandbox against your roster. Prefer the{" "}
        <strong className="font-semibold text-[var(--navy)]">Scenarios</strong> tab on a submitted
        estimate for CR-specific analysis. Filter the roster by org below.
      </p>
      <p className="text-sm text-[var(--muted)]">
        <Link href="/estimates?status=READY_FOR_REVIEW" className="underline">
          Open estimates ready for review
        </Link>{" "}
        and use Scenarios there when you have a governed pack.
      </p>

      <OrgScopeFilters
        basePath="/what-if"
        units={orgFilter.units}
        teams={orgFilter.teams}
        lockedUnitIds={orgFilter.lockedUnitIds}
        lockedTeamId={orgFilter.lockedTeamId}
        org={org}
        team={teamFilter}
        showWorkRelease={false}
      />

      {selectedTeams.length === 0 ? (
        <p className="card p-5 text-sm text-[var(--muted)]">
          No pods in this selection. Attach pods under a Crew in Organisation setup, or widen the
          filter.
        </p>
      ) : (
        <WhatIfForm teams={toScenarioTeams(selectedTeams, locations)} mode="standalone" />
      )}
    </div>
  );
}
