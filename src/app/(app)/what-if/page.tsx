import { prisma } from "@/lib/prisma";
import { WhatIfForm } from "@/components/WhatIfForm";

export default async function WhatIfPage() {
  const teams = await prisma.team.findMany({ include: { members: true } });
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">What-If optimisation</h1>
      <p className="text-sm text-[var(--muted)]">
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
