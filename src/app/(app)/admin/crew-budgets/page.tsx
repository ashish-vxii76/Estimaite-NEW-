import { auth } from "@/auth";
import { can } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { CrewBudgetManager } from "@/components/admin/CrewBudgetManager";
import { adminOrgScope, adminVisibleCrewIds } from "@/services/orgService";
import { fromSession } from "@/lib/scope";
import { getActiveConfig } from "@/services/configService";
import { yearsFromCatalogue } from "@/lib/releasePeriod";

export default async function CrewBudgetsAdminPage() {
  const session = await auth();
  if (!can(session?.user.role, "org.budget")) redirect("/home");

  const scope = await adminOrgScope(fromSession(session!.user));
  const crewIds = await adminVisibleCrewIds(fromSession(session!.user));
  const [budgets, units, config] = await Promise.all([
    prisma.crewBudget.findMany({
      where: crewIds == null ? undefined : { crewId: { in: crewIds } },
      include: { crew: true },
      orderBy: [{ year: "desc" }, { crew: { name: "asc" } }],
    }),
    prisma.orgUnit.findMany({
      where: { active: true },
      orderBy: [{ type: "asc" }, { name: "asc" }],
    }),
    getActiveConfig(),
  ]);

  // Budget years come from the configured Release-quarters catalogue (single source of truth).
  const releaseYears = yearsFromCatalogue(config.releaseQuarters ?? []).map(Number).sort((a, b) => a - b);
  const calYear = new Date().getFullYear();
  const year = releaseYears.includes(calYear) ? calYear : releaseYears[releaseYears.length - 1] ?? calYear;

  // DEC-016: for a scoped admin, restrict the New-budget cascade to their subtree and lock the fixed
  // ancestor chain (anchor + everything above it) read-only. App admins get the whole tree, unlocked.
  const byId = new Map(units.map((u) => [u.id, u]));
  const lockedUnitIds: string[] = [];
  if (!scope.appLevel && scope.anchorId) {
    let cur = byId.get(scope.anchorId);
    while (cur) {
      lockedUnitIds.push(cur.id);
      cur = cur.parentId ? byId.get(cur.parentId) : undefined;
    }
  }
  const lockedSet = new Set(lockedUnitIds);
  const visibleUnits = scope.appLevel
    ? units
    : units.filter((u) => scope.visibleIds.has(u.id) || lockedSet.has(u.id));

  return (
    <div className="space-y-4">
      <CrewBudgetManager
        initialBudgets={budgets}
        units={visibleUnits}
        canWrite={can(session?.user.role, "org.budget", "RW")}
        defaultYear={year}
        releaseYears={releaseYears}
        lockedUnitIds={lockedUnitIds}
        scopeCrewIds={crewIds}
      />
    </div>
  );
}
