import { auth } from "@/auth";
import { can } from "@/lib/access";
import { redirect } from "next/navigation";
import { CrewBudgetsWorkspace } from "@/components/admin/CrewBudgetsWorkspace";
import {
  adminVisibleCrewIds,
  approvableCrewIds,
  descendantIds,
  listCrewBudgets,
  resolveOrgCurrency,
} from "@/services/orgService";
import { resolveCrewScope } from "@/lib/crewScope";
import { fromSession } from "@/lib/scope";
import { getActiveConfig } from "@/services/configService";
import { yearsFromCatalogue } from "@/lib/releasePeriod";

type StatusFilter = "ALL" | "PENDING" | "APPROVED";

/** A budget with a pending create or a parked change is "awaiting approval". */
function isAwaiting(b: { status: string; pendingAmount: number | null }) {
  return b.status === "PENDING" || b.pendingAmount != null;
}

export default async function CrewBudgetsPage({
  searchParams,
}: {
  searchParams: Promise<{ crew?: string; status?: string; new?: string; org?: string; year?: string }>;
}) {
  const session = await auth();
  if (!can(session?.user.role, "org.budget")) redirect("/home");

  const { crew = "", status = "", new: isNew = "", org = "", year = "" } = await searchParams;
  const user = fromSession(session!.user);
  // Two modes, like Estimates: the cross-crew queue (list/approve, filtered via the drawer) vs the
  // single-crew editor (create/edit through the cascade panel).
  const mode: "queue" | "editor" = crew || isNew === "1" ? "editor" : "queue";

  const [scope, crewIds, config] = await Promise.all([
    resolveCrewScope(user, crew || null),
    adminVisibleCrewIds(user),
    getActiveConfig(),
  ]);
  const allBudgets = await listCrewBudgets(null, crewIds);

  const releaseYears = yearsFromCatalogue(config.releaseQuarters ?? [])
    .map(Number)
    .sort((a, b) => a - b);

  // Which of the crews in view may THIS user approve — resolved once, applied per row in the queue.
  const distinctCrewIds = [...new Set(allBudgets.map((b) => b.crewId))];
  const approverCrewIds = [...(await approvableCrewIds(user, distinctCrewIds))];

  const statusFilter: StatusFilter =
    status === "PENDING" ? "PENDING" : status === "APPROVED" ? "APPROVED" : "ALL";

  // Queue drawer filters (org cascade + release year + status) applied server-side so the URL is the
  // single source of truth — same contract as the Estimates register.
  const underOrg = org ? new Set<string>([org, ...(await descendantIds(org))]) : null;
  const yearNum = year ? Number(year) : null;
  const queueBudgets = allBudgets.filter((b) => {
    if (underOrg && !underOrg.has(b.crewId)) return false;
    if (yearNum != null && b.year !== yearNum) return false;
    if (statusFilter === "PENDING" && !isAwaiting(b)) return false;
    if (statusFilter === "APPROVED" && b.status !== "APPROVED") return false;
    return true;
  });

  const activeCrewId = scope.activeScopeType === "CREW" ? scope.activeCrewId : null;
  const activeCrewCurrency = activeCrewId
    ? await resolveOrgCurrency({ crewIds: [activeCrewId] })
    : "CHF";

  // Editor shows all of the active crew's budgets; the queue shows the filtered set.
  const source = mode === "editor" ? allBudgets : queueBudgets;

  return (
    <CrewBudgetsWorkspace
      mode={mode}
      statusFilter={statusFilter}
      units={scope.units}
      lockedUnitIds={scope.lockedUnitIds}
      crews={scope.crews}
      activeCrewId={scope.activeCrewId}
      activeScopeType={scope.activeScopeType}
      activeScopeName={scope.activeScopeName}
      budgets={source.map((b) => ({
        id: b.id,
        crewId: b.crewId,
        crewName: b.crew.name,
        year: b.year,
        amount: b.amount,
        pendingAmount: b.pendingAmount,
        status: b.status,
        currency: b.currency,
        requestedById: b.requestedById,
      }))}
      releaseYears={releaseYears}
      activeCrewCurrency={activeCrewCurrency}
      approverCrewIds={approverCrewIds}
      currentUserId={session!.user.id}
      canWrite={can(session?.user.role, "org.budget", "RW")}
      filters={{ org, status, year }}
    />
  );
}
