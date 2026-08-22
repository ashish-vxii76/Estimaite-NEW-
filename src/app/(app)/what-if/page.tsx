import { WhatIfForm, toScenarioTeams } from "@/components/WhatIfForm";
import { auth } from "@/auth";
import { fromSession, teamsForUser } from "@/lib/scope";
import Link from "next/link";

export default async function WhatIfPage() {
  const session = await auth();
  const teams = await teamsForUser(fromSession(session!.user));
  return (
    <div className="space-y-4">
      <p className="kicker">Scenario</p>
      <h1 className="font-display text-2xl font-semibold text-[var(--navy)]">What-If (standalone)</h1>
      <p className="text-sm text-[var(--muted)]">
        Generic sandbox against your roster. Prefer the{" "}
        <strong className="font-semibold text-[var(--navy)]">Scenarios</strong> tab on a submitted
        estimate for CR-specific analysis. Scenarios never modify an approved estimate.
      </p>
      <p className="text-sm text-[var(--muted)]">
        <Link href="/estimates?status=READY_FOR_REVIEW" className="underline">
          Open estimates ready for review
        </Link>{" "}
        and use Scenarios there when you have a governed pack.
      </p>
      <WhatIfForm teams={toScenarioTeams(teams)} mode="standalone" />
    </div>
  );
}
