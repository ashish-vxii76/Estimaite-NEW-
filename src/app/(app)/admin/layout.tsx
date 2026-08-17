import { AdminNav } from "@/components/admin/AdminNav";
import { auth } from "@/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  return (
    <div className="space-y-5">
      <div>
        <p className="kicker">Administration</p>
        <p className="text-sm text-[var(--muted)]">
          Access, mappings and rates. What you can open follows the RBAC matrix. Admin sees every
          team; other profiles are limited to their assigned team.
        </p>
      </div>
      <div className="lg:hidden">
        <AdminNav role={session?.user.role} />
      </div>
      {children}
    </div>
  );
}
