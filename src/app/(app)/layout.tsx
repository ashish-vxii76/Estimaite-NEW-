import { auth } from "@/auth";
import { AppShell } from "@/components/AppShell";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const [profiles, team] = await Promise.all([
    prisma.user.findMany({
      where: { active: true },
      select: { email: true, name: true, role: true, team: { select: { name: true } } },
      orderBy: { name: "asc" },
    }),
    session.user.teamId
      ? prisma.team.findUnique({ where: { id: session.user.teamId }, select: { name: true } })
      : Promise.resolve(null),
  ]);
  return (
    <AppShell
      user={session.user}
      teamName={session.user.role === "ADMINISTRATOR" ? "All teams" : team?.name ?? null}
      profiles={profiles.map((p) => ({
        email: p.email,
        name: p.name,
        role: p.role,
        teamName: p.team?.name ?? null,
      }))}
    >
      {children}
    </AppShell>
  );
}
