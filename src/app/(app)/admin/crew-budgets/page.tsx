import { auth } from "@/auth";
import { can } from "@/lib/access";
import { redirect } from "next/navigation";
import { CrewBudgetsWorkspace } from "@/components/admin/CrewBudgetsWorkspace";
import { adminVisibleCrewIds, canApproveBudget, listCrewBudgets, resolveOrgCurrency } from "@/services/orgService";
import { resolveCrewScope } from "@/lib/crewScope";
import { fromSession } from "@/lib/scope";
import { getActiveConfig } from "@/services/configService";
import { yearsFromCatalogue } from "@/lib/releasePeriod";

export default async function CrewBudgetsAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ crew?: string }>;
}) {
  const session = await auth();
  if (!can(session?.user.role, "org.budget")) redirect("/home");

  const { crew = "" } = await searchParams;
  const user = fromSession(session!.user);
  const scope = await resolveCrewScope(user, crew || null);
  const crewIds = await adminVisibleCrewIds(user);
  const [budgets, config] = await Promise.all([
    listCrewBudgets(null, crewIds),
    getActiveConfig(),
  ]);

  const releaseYears = yearsFromCatalogue(config.releaseQuarters ?? [])
    .map(Number)
    .sort((a, b) => a - b);

  // Only a Crew scope is editable; App/Company scope shows the read-only roll-up.
  const activeCrewId = scope.activeScopeType === "CREW" ? scope.activeCrewId : null;
  const canApprove = activeCrewId ? await canApproveBudget(user, activeCrewId) : false;
  const activeCrewCurrency = activeCrewId
    ? await resolveOrgCurrency({ crewIds: [activeCrewId] })
    : "CHF";

  return (
    <CrewBudgetsWorkspace
      units={scope.units}
      lockedUnitIds={scope.lockedUnitIds}
      crews={scope.crews}
      activeCrewId={scope.activeCrewId}
      activeScopeType={scope.activeScopeType}
      activeScopeName={scope.activeScopeName}
      budgets={budgets.map((b) => ({
        id: b.id,
        crewId: b.crewId,
        crewName: b.crew.name,
        year: b.year,
        amount: b.amount,
        pendingAmount: b.pendingAmount,
        status: b.status,
        currency: b.currency,
      }))}
      releaseYears={releaseYears}
      activeCrewCurrency={activeCrewCurrency}
      canWrite={can(session?.user.role, "org.budget", "RW")}
      canApprove={canApprove}
    />
  );
}
