import { auth } from "@/auth";
import { can } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { OrganisationSetup } from "@/components/admin/OrganisationSetup";

export default async function OrganisationAdminPage() {
  const session = await auth();
  if (!can(session?.user.role, "org.setup")) redirect("/home");

  const [units, teams, seats, users] = await Promise.all([
    prisma.orgUnit.findMany({ orderBy: [{ type: "asc" }, { name: "asc" }] }),
    prisma.team.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, crewId: true, active: true },
    }),
    prisma.orgSeat.findMany({
      where: { isPrimary: true },
      include: {
        user: { select: { id: true, email: true, name: true, role: true } },
        orgUnit: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findMany({
      where: { active: true },
      select: { id: true, email: true, name: true, role: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="space-y-4">
      <OrganisationSetup
        initialUnits={units}
        initialTeams={teams}
        initialSeats={seats}
        users={users}
        canEdit={can(session?.user.role, "org.setup", "RW")}
      />
    </div>
  );
}
