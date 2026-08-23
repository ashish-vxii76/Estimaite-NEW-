import { auth } from "@/auth";
import { can } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { CrewBudgetManager } from "@/components/admin/CrewBudgetManager";
import { visibleCrewIds } from "@/services/orgService";
import { fromSession } from "@/lib/scope";

export default async function CrewBudgetsAdminPage() {
  const session = await auth();
  if (!can(session?.user.role, "org.budget")) redirect("/home");

  const year = new Date().getFullYear();
  const crewIds = await visibleCrewIds(fromSession(session!.user));
  const [budgets, units] = await Promise.all([
    prisma.crewBudget.findMany({
      where: crewIds == null ? undefined : { crewId: { in: crewIds } },
      include: { crew: true },
      orderBy: [{ year: "desc" }, { crew: { name: "asc" } }],
    }),
    prisma.orgUnit.findMany({
      where: { active: true },
      orderBy: [{ type: "asc" }, { name: "asc" }],
    }),
  ]);

  return (
    <div className="space-y-4">
      <CrewBudgetManager
        initialBudgets={budgets}
        units={units}
        canWrite={can(session?.user.role, "org.budget", "RW")}
        defaultYear={year}
      />
    </div>
  );
}
