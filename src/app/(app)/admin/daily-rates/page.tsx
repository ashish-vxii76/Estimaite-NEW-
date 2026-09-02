import { Suspense } from "react";
import { auth } from "@/auth";
import { can } from "@/lib/access";
import { redirect } from "next/navigation";
import { loadMappingPageData } from "@/lib/mappingPageData";
import { MappingPageShell } from "@/components/admin/MappingPageShell";
import type { Column } from "@/components/admin/MappingEditor";

const COLUMNS: Column[] = [
  { key: "location", label: "Location" },
  { key: "dailyRate", label: "Daily Rate", type: "number" },
  { key: "currency", label: "Currency" },
];

export default async function DailyRatesPage({
  searchParams,
}: {
  searchParams: Promise<{ crew?: string }>;
}) {
  const session = await auth();
  const role = session?.user.role;
  if (!can(role, "config.rates") && !can(role, "config.crewMappings")) redirect("/home");
  const { crew = "" } = await searchParams;
  const { scope, globalRows, override } = await loadMappingPageData(session!.user, "LOCATION_DAILY_RATES", crew);

  return (
    <Suspense fallback={<div className="text-sm text-[var(--muted)]">Loading…</div>}>
      <MappingPageShell
        table="LOCATION_DAILY_RATES"
        title="Location Daily Rates"
        description="Blended daily rate uses Dev/QA roster headcount × these CHF daily rates. SM, PO and IT Lead are not costed."
        section="locationDailyRates"
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
