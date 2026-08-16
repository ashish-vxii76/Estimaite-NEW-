import Link from "next/link";
import { ADMIN_PAGES } from "@/components/admin/adminPages";

export default function AdminHomePage() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {ADMIN_PAGES.filter(([href]) => href !== "/admin").map(([href, label]) => (
        <Link key={href} href={href} className="card p-5 hover:border-teal-400">
          <h2 className="font-medium">{label}</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">Open and configure this mapping table.</p>
        </Link>
      ))}
    </div>
  );
}
