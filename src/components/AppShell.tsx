import { Suspense } from "react";
import { SideNav } from "@/components/nav/SideNav";
import { SignOutButton } from "@/components/SignOutButton";

export function AppShell({
  children,
  user,
}: {
  children: React.ReactNode;
  user: { name?: string | null; email?: string | null; role?: string };
}) {
  return (
    <div className="flex min-h-screen">
      <Suspense
        fallback={
          <aside className="hidden w-72 shrink-0 border-r border-[var(--line)] bg-[var(--panel)] md:block" />
        }
      >
        <SideNav
          role={user.role ?? "VIEWER"}
          userName={user.name}
          userRole={user.role}
          signOut={<SignOutButton />}
        />
      </Suspense>
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="px-4 py-6 md:px-8">{children}</main>
      </div>
    </div>
  );
}
