import { Suspense } from "react";
import { SideNav } from "@/components/nav/SideNav";
import { SignOutButton } from "@/components/SignOutButton";
import { ProfileSwitcher, type ProfileOption } from "@/components/ProfileSwitcher";
import { NotificationBell } from "@/components/NotificationBell";
import { roleLabel } from "@/lib/roles";
import type { RbacMatrix } from "@/lib/rbac";
import type { AppNotification } from "@/lib/homeInbox";

export function AppShell({
  children,
  user,
  teamName,
  profiles,
  matrix,
  notifications = [],
  showNotifications = false,
}: {
  children: React.ReactNode;
  user: { name?: string | null; email?: string | null; role?: string };
  teamName?: string | null;
  profiles: ProfileOption[];
  matrix?: RbacMatrix;
  notifications?: AppNotification[];
  showNotifications?: boolean;
}) {
  const roleLine = teamName ? `${teamName} · ${roleLabel(user.role)}` : roleLabel(user.role);
  return (
    <div className="flex min-h-screen">
      <Suspense
        fallback={
          <aside className="hidden w-72 shrink-0 border-r border-[var(--line)] bg-[var(--panel)] md:block" />
        }
      >
        <SideNav
          role={user.role ?? "VIEWER"}
          matrix={matrix}
          userName={user.name}
          userRole={roleLine}
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
        <header className="sticky top-0 z-40 flex h-14 items-center justify-end gap-3 border-b border-[var(--line)] bg-[var(--bg)]/95 px-4 backdrop-blur md:px-8">
          {showNotifications ? <NotificationBell items={notifications} /> : null}
        </header>
        <main className="px-4 py-6 md:px-8">{children}</main>
      </div>
    </div>
  );
}
