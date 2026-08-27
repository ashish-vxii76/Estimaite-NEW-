import { auth } from "@/auth";
import { can } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { CrewBudgetManager } from "@/components/admin/CrewBudgetManager";
import { visibleCrewIds } from "@/services/orgService";
import { fromSession } from "@/lib/scope";
import { getActiveConfig } from "@/services/configService";
import { yearsFromCatalogue } from "@/lib/releasePeriod";

export default async function CrewBudgetsAdminPage() {
  const session = await auth();
  if (!can(session?.user.role, "org.budget")) redirect("/home");

  const crewIds = await visibleCrewIds(fromSession(session!.user));
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

  return (
    <div className="space-y-4">
      <CrewBudgetManager
        initialBudgets={budgets}
        units={units}
        canWrite={can(session?.user.role, "org.budget", "RW")}
        defaultYear={year}
        releaseYears={releaseYears}
      />
    </div>
  );
}
