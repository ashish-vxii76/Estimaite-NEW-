import { Suspense } from "react";
import { auth } from "@/auth";
import { can } from "@/lib/access";
import { redirect } from "next/navigation";
import { loadMappingPageData } from "@/lib/mappingPageData";
import { MappingPageShell } from "@/components/admin/MappingPageShell";
import type { Column } from "@/components/admin/MappingEditor";
import { CURRENCIES } from "@/lib/currencies";

const COLUMNS: Column[] = [
  { key: "teamLocation", label: "Team Location" },
  { key: "teamName", label: "Team / Pod" },
  { key: "teamSprintCost", label: "Team Sprint Cost", type: "number" },
  { key: "resourceSprintCost", label: "Resource Sprint Cost", type: "number" },
  { key: "standardTeamSize", label: "Standard Team Size", type: "number" },
  { key: "currency", label: "Currency", type: "select", options: [...CURRENCIES] },
];

export default async function TeamCostMappingPage({
  searchParams,
}: {
  searchParams: Promise<{ crew?: string }>;
}) {
  const session = await auth();
  const role = session?.user.role;
  if (!can(role, "config.rates") && !can(role, "config.crewMappings")) redirect("/home");
  const { crew = "" } = await searchParams;
  const { scope, globalRows, override } = await loadMappingPageData(session!.user, "TEAM_SPRINT_RATES", crew);

  return (
    <Suspense fallback={<div className="text-sm text-[var(--muted)]">Loading…</div>}>
      <MappingPageShell
        table="TEAM_SPRINT_RATES"
        title="Team Sprint Rates"
        description="Team/Pod-level sprint rates. Rows are per Pod; a crew tunes its pods' rates. Team Sprint Rate is not prorated unless a commercial policy says so."
        section="teamCostMappings"
        columns={COLUMNS}
        globalRows={globalRows}
        units={scope.units}
        lockedUnitIds={scope.lockedUnitIds}
        crews={scope.crews}
        activeCrewId={scope.activeCrewId}
        override={override}
        canEditGlobal={can(role, "config.rates", "RW")}
        canWriteCrew={can(role, "config.crewMappings", "RW")}
        canApprove={can(role, "config.rates", "RW")}
      />
    </Suspense>
  );
}
