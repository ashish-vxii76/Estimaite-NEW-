import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { UsersAdmin, type GrantRow } from "@/components/admin/UsersAdmin";
import { can } from "@/lib/access";

export default async function UsersPage() {
  const session = await auth();
  if (!can(session?.user.role, "config.users", "RW")) redirect("/home");
  const [users, teams, orgUnits, grants] = await Promise.all([
    prisma.user.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        active: true,
        teamId: true,
        pendingApproval: true,
        resetRequestedAt: true,
      },
    }),
    prisma.team.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.orgUnit.findMany({
      where: { active: true },
      select: { id: true, name: true, type: true },
      orderBy: [{ type: "asc" }, { name: "asc" }],
    }),
    prisma.roleGrant.findMany({
      include: { team: { select: { name: true } }, orgUnit: { select: { name: true } } },
      orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
    }),
  ]);

  const grantsByUser: Record<string, GrantRow[]> = {};
  for (const g of grants) {
    (grantsByUser[g.userId] ??= []).push({
      id: g.id,
      userId: g.userId,
      role: g.role,
      label: g.label,
      teamId: g.teamId,
      orgUnitId: g.orgUnitId,
      isPrimary: g.isPrimary,
      scopeName: g.team?.name ?? g.orgUnit?.name ?? null,
    });
  }

  return <UsersAdmin initial={users} teams={teams} orgUnits={orgUnits} grantsByUser={grantsByUser} />;
}
