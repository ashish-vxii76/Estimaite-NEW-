import { auth } from "@/auth";
import { AppShell } from "@/components/AppShell";
import { redirect } from "next/navigation";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return <AppShell user={session.user}>{children}</AppShell>;
}
