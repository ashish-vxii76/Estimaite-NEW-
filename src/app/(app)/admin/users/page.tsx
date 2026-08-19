import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { UsersAdmin } from "@/components/admin/UsersAdmin";
import { can } from "@/lib/access";

export default async function UsersPage() {
  const session = await auth();
  if (!can(session?.user.role, "config.users", "RW")) redirect("/home");
  const [users, teams] = await Promise.all([
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
  ]);
  return <UsersAdmin initial={users} teams={teams} />;
}
