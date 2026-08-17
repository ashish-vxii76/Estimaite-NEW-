import { auth } from "@/auth";
import { AppShell } from "@/components/AppShell";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const profiles = await prisma.user.findMany({
    where: { active: true },
    select: { email: true, name: true, role: true },
    orderBy: { name: "asc" },
  });
  return (
    <AppShell user={session.user} profiles={profiles}>
      {children}
    </AppShell>
  );
}
