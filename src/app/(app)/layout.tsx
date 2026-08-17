import { auth } from "@/auth";
import { AppShell } from "@/components/AppShell";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getRbacMatrix } from "@/services/rbacService";
import { canAccessPath } from "@/lib/access";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const matrix = await getRbacMatrix();
  const pathname = (await headers()).get("x-estimaite-pathname") ?? "/";
  if (pathname !== "/" && !canAccessPath(session.user.role, pathname)) {
    redirect("/");
  }
  let profiles: { email: string; name: string; role: string; teamName: string | null }[] = [];
  let teamName: string | null = session.user.role === "ADMINISTRATOR" ? "All teams" : null;
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
    if (session.user.role !== "ADMINISTRATOR") teamName = team?.name ?? null;
  } catch {
    const users = await prisma.user.findMany({
      where: { active: true },
      select: { email: true, name: true, role: true },
      orderBy: { name: "asc" },
    });
    profiles = users.map((p) => ({ ...p, teamName: null }));
  }
  return (
    <AppShell user={session.user} teamName={teamName} profiles={profiles} matrix={matrix}>
      {children}
    </AppShell>
  );
}
