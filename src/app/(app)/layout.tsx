import { auth } from "@/auth";
import { AppShell } from "@/components/AppShell";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getRbacMatrix } from "@/services/rbacService";
import { can, canAccessPath, seesAllTeams } from "@/lib/access";
import { buildNotifications } from "@/lib/homeInbox";
import { fromSession } from "@/lib/scope";

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

  let profiles: { email: string; name: string; role: string; teamName: string | null }[] = [];
  const crossTeam = seesAllTeams(session.user.role);
  let teamName: string | null = crossTeam ? "All teams" : null;
  try {
    const [users, team] = await Promise.all([
      prisma.user.findMany({
        where: { active: true },
        select: { email: true, name: true, role: true, team: { select: { name: true } } },
        orderBy: { name: "asc" },
      }),
      session.user.teamId
        ? prisma.team.findUnique({ where: { id: session.user.teamId }, select: { name: true } })
        : Promise.resolve(null),
    ]);
    profiles = users.map((p) => ({
      email: p.email,
      name: p.name,
      role: p.role,
      teamName: p.team?.name ?? null,
    }));
    if (!crossTeam) teamName = team?.name ?? null;
  } catch {
    const users = await prisma.user.findMany({
      where: { active: true },
      select: { email: true, name: true, role: true },
      orderBy: { name: "asc" },
    });
    profiles = users.map((p) => ({ ...p, teamName: null }));
  }

  const showNotifications = can(session.user.role, "home.notifications");
  const notifications = showNotifications
    ? await buildNotifications(fromSession(session.user))
    : [];

  return (
    <AppShell
      user={session.user}
      teamName={teamName}
      profiles={profiles}
      matrix={matrix}
      showNotifications={showNotifications}
      notifications={notifications}
    >
      {children}
    </AppShell>
  );
}
