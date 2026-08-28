import { Suspense } from "react";
import { SideNav } from "@/components/nav/SideNav";
import { SignOutButton } from "@/components/SignOutButton";
import { RoleSwitcher, type RoleOption } from "@/components/RoleSwitcher";
import { NotificationBell } from "@/components/NotificationBell";
import { HeaderBar } from "@/components/HeaderBar";
import { roleLabel } from "@/lib/roles";
import type { RbacMatrix } from "@/lib/rbac";
import type { AppNotification } from "@/lib/homeInbox";

export function AppShell({
  children,
  user,
  teamName,
  roleOptions,
  matrix,
  notifications = [],
  showNotifications = false,
}: {
  children: React.ReactNode;
  user: { name?: string | null; email?: string | null; role?: string };
  teamName?: string | null;
  roleOptions: RoleOption[];
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
          profileSwitcher={<RoleSwitcher options={roleOptions} />}
        />
      </Suspense>
      <div className="flex min-w-0 flex-1 flex-col">
        <HeaderBar bell={showNotifications ? <NotificationBell items={notifications} /> : null} />
        <main className="px-4 py-6 md:px-8">{children}</main>
      </div>
    </div>
  );
}
