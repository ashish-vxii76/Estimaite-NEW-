import { auth } from "@/auth";
import { can } from "@/lib/access";
import { redirect } from "next/navigation";
import { fromSession } from "@/lib/scope";
import { visibleCrewIds } from "@/services/orgService";
import { getActiveConfig } from "@/services/configService";
import { prisma } from "@/lib/prisma";
import { CrewResourceLevelsManager } from "@/components/admin/CrewResourceLevelsManager";

export default async function CrewResourceLevelsPage() {
  const session = await auth();
  if (!can(session?.user.role, "config.crewLevels")) redirect("/home");

  const config = await getActiveConfig();
  const ids = await visibleCrewIds(fromSession(session!.user));
  const crews = await prisma.orgUnit.findMany({
    where: { type: "CREW", active: true, ...(ids == null ? {} : { id: { in: ids } }) },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-4">
      <CrewResourceLevelsManager
        crews={crews}
        resourceLevels={config.resourceLevels.map((l) => ({
          id: l.id,
          name: l.name,
          capacitySpPerSprint: l.capacitySpPerSprint,
          daysPerPoint: l.daysPerPoint,
        }))}
        overrides={config.crewDaysPerPoint ?? {}}
        capacityOverrides={config.crewCapacitySpPerSprint ?? {}}
        canWrite={can(session?.user.role, "config.crewLevels", "RW")}
      />
    </div>
  );
}
