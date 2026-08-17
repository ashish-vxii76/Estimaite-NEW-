import { Suspense } from "react";
import { SideNav } from "@/components/nav/SideNav";
import { SignOutButton } from "@/components/SignOutButton";
import { ProfileSwitcher, type ProfileOption } from "@/components/ProfileSwitcher";
import { roleLabel } from "@/lib/roles";

export function AppShell({
  children,
  user,
  profiles,
}: {
  children: React.ReactNode;
  user: { name?: string | null; email?: string | null; role?: string };
  profiles: ProfileOption[];
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
          userRole={roleLabel(user.role)}
          signOut={<SignOutButton />}
          profileSwitcher={
            <ProfileSwitcher
              currentEmail={user.email}
              currentRole={user.role}
              profiles={profiles}
            />
          }
        />
      </Suspense>
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="px-4 py-6 md:px-8">{children}</main>
      </div>
    </div>
  );
}
