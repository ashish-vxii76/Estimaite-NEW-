import { WhatIfForm } from "@/components/WhatIfForm";
import { OrgLockedPathFilters } from "@/components/OrgLockedPathFilters";
import { toScenarioTeams } from "@/lib/scenarioTeams";
import { auth } from "@/auth";
import { fromSession, teamsForUser } from "@/lib/scope";
import { lockedOrgPathForUser } from "@/lib/lockedOrgPath";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function WhatIfPage({
  searchParams,
}: {
  searchParams: Promise<{ team?: string }>;
}) {
  const session = await auth();
  const { team: teamFilter = "" } = await searchParams;
  const [teams, locations, lockedPath] = await Promise.all([
    teamsForUser(fromSession(session!.user)),
    prisma.location.findMany({ where: { active: true } }),
    lockedOrgPathForUser(session!.user.id),
  ]);

  const pods = lockedPath.crewId
    ? teams.filter((t) => t.crewId === lockedPath.crewId)
    : teams;
  const filtered = teamFilter ? pods.filter((t) => t.id === teamFilter) : pods;

  return (
    <div className="space-y-4">
      <p className="kicker">Scenario</p>
      <h1 className="font-display text-2xl font-semibold text-[var(--navy)]">What-If (standalone)</h1>
      <p className="text-sm text-[var(--muted)]">
        Generic sandbox against your roster. Prefer the{" "}
        <strong className="font-semibold text-[var(--navy)]">Scenarios</strong> tab on a submitted
        estimate for CR-specific analysis. Organisation path is locked; only Pod is open.
      </p>
      <p className="text-sm text-[var(--muted)]">
        <Link href="/estimates?status=READY_FOR_REVIEW" className="underline">
          Open estimates ready for review
        </Link>{" "}
        and use Scenarios there when you have a governed pack.
      </p>

      <OrgLockedPathFilters
        basePath="/what-if"
        path={lockedPath}
        teams={pods.map((t) => ({ id: t.id, name: t.name }))}
        team={teamFilter}
      />

      {filtered.length === 0 ? (
        <p className="card p-5 text-sm text-[var(--muted)]">
          No pods in this locked path. Attach pods under your Crew in Organisation setup, or clear
          the Pod filter.
        </p>
      ) : (
        <WhatIfForm teams={toScenarioTeams(filtered, locations)} mode="standalone" />
      )}
    </div>
  );
}
