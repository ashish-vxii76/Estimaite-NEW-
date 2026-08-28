import { auth } from "@/auth";
import { AppShell } from "@/components/AppShell";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getRbacMatrix } from "@/services/rbacService";
import { can, canAccessPath, seesAllTeams } from "@/lib/access";
import { buildNotifications } from "@/lib/homeInbox";
import { fromSession } from "@/lib/scope";
import { roleLabel } from "@/lib/roles";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const matrix = await getRbacMatrix();
  const pathname = (await headers()).get("x-estimaite-pathname") ?? "/home";
  if (pathname !== "/home" && !canAccessPath(session.user.role, pathname)) {
    redirect("/home");
  }
  if (pathname === "/home" && !can(session.user.role, "home")) {
    redirect("/estimates");
  }

  const crossTeam = seesAllTeams(session.user.role);
  let teamName: string | null = crossTeam ? "All teams" : null;
  if (!crossTeam && session.user.teamId) {
    const team = await prisma.team.findUnique({
      where: { id: session.user.teamId },
      select: { name: true },
    });
    teamName = team?.name ?? null;
  }

  // The Switch-Role control lists only THIS user's granted roles (empty/single → hidden).
  const grants = await prisma.roleGrant.findMany({
    where: { userId: session.user.id },
    include: { team: { select: { name: true } }, orgUnit: { select: { name: true } } },
    orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
  });
  const roleOptions = grants.map((g) => ({
    id: g.id,
    label: g.label ?? roleLabel(g.role),
    scopeName: g.team?.name ?? g.orgUnit?.name ?? null,
    isActive: session.user.activeGrantId === g.id,
  }));

  const showNotifications = can(session.user.role, "home.notifications");
  const notifications = showNotifications
    ? await buildNotifications(fromSession(session.user))
    : [];

  return (
    <AppShell
      user={session.user}
      teamName={teamName}
      roleOptions={roleOptions}
      matrix={matrix}
      showNotifications={showNotifications}
      notifications={notifications}
    >
      {children}
    </AppShell>
  );
}
