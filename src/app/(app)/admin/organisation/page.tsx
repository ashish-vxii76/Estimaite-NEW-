import { auth } from "@/auth";
import { can } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { OrgNodeSetup } from "@/components/admin/OrgNodeSetup";

export default async function OrganisationAdminPage() {
  const session = await auth();
  if (!can(session?.user.role, "org.setup")) redirect("/home");

  const [units, teams, seats, members, users] = await Promise.all([
    prisma.orgUnit.findMany({
      orderBy: [{ type: "asc" }, { name: "asc" }],
      select: { id: true, type: true, name: true, parentId: true, active: true },
    }),
    prisma.team.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, crewId: true, active: true },
    }),
    prisma.orgSeat.findMany({
      where: { isPrimary: true },
      include: { user: { select: { id: true, email: true, name: true, role: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.teamMember.findMany({
      orderBy: [{ teamId: "asc" }, { name: "asc" }],
      select: { id: true, teamId: true, name: true, roleStream: true, resourceLevel: true, location: true },
    }),
    prisma.user.findMany({
      where: { active: true },
      select: { id: true, email: true, name: true, role: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <OrgNodeSetup
      units={units}
      teams={teams}
      seats={seats.map((s) => ({
        id: s.id,
        seatType: s.seatType,
        orgUnitId: s.orgUnitId,
        user: s.user,
      }))}
      members={members}
      users={users}
      canEdit={can(session?.user.role, "org.setup", "RW")}
    />
  );
}
