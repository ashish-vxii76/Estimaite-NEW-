import { Suspense } from "react";
import { auth } from "@/auth";
import { can } from "@/lib/access";
import { redirect } from "next/navigation";
import { loadMappingPageData } from "@/lib/mappingPageData";
import { MappingPageShell } from "@/components/admin/MappingPageShell";
import type { Column } from "@/components/admin/MappingEditor";
import { CURRENCIES } from "@/lib/currencies";

const COLUMNS: Column[] = [
  { key: "location", label: "Location" },
  { key: "teamSprintCost", label: "Team Sprint Cost", type: "number" },
  { key: "resourceSprintCost", label: "Resource Sprint Cost", type: "number" },
  { key: "standardTeamSize", label: "Standard Team Size", type: "number" },
  { key: "currency", label: "Currency", type: "select", options: [...CURRENCIES] },
];

export default async function CostMappingPage({
  searchParams,
}: {
  searchParams: Promise<{ crew?: string }>;
}) {
  const session = await auth();
  const role = session?.user.role;
  if (!can(role, "config.rates") && !can(role, "config.crewMappings")) redirect("/home");
  const { crew = "" } = await searchParams;
  const { scope, globalRows, override } = await loadMappingPageData(session!.user, "LOCATION_SPRINT_RATES", crew);

  return (
    <Suspense fallback={<div className="text-sm text-[var(--muted)]">Loading…</div>}>
      <MappingPageShell
        table="LOCATION_SPRINT_RATES"
        title="Location Sprint Rates"
        description="Location rate card. Daily rates are in the configured currency per resource-day and drive blended costing and resource-sprint economics."
        section="costMappings"
        columns={COLUMNS}
        globalRows={globalRows}
        units={scope.units}
        lockedUnitIds={scope.lockedUnitIds}
        crews={scope.crews}
        activeCrewId={scope.activeCrewId}
        scopeType={scope.activeScopeType}
        scopeName={scope.activeScopeName}
        override={override}
        canEditGlobal={can(role, "config.rates", "RW")}
        canWriteCrew={can(role, "config.crewMappings", "RW")}
        canApprove={can(role, "config.rates", "RW")}
      />
    </Suspense>
  );
}
