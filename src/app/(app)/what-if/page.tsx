import { WhatIfForm } from "@/components/WhatIfForm";
import { auth } from "@/auth";
import { fromSession, teamsForUser } from "@/lib/scope";

export default async function WhatIfPage() {
  const session = await auth();
  const teams = await teamsForUser(fromSession(session!.user));
  return (
    <div className="space-y-4">
      <p className="kicker">Scenario</p>
      <h1 className="font-display text-2xl font-semibold text-[var(--navy)]">What-If optimisation</h1>
      <p className="text-sm text-[var(--muted)]">
        Run against the roster this profile can see. A Vikings Approver only models Vikings.
        Scenarios never modify an approved estimate. Senior is not recommended if the team has none
        configured.
      </p>
      <WhatIfForm
        teams={teams.map((t) => ({
          teamId: t.id,
          teamName: t.name,
          availableLevels: [...new Set(t.members.map((m) => m.resourceLevel))],
          maxDev: Math.max(1, t.members.filter((m) => m.roleStream === "DEV").length),
          maxQa: Math.max(1, t.members.filter((m) => m.roleStream === "QA").length),
        }))}
      />
    </div>
  );
}
