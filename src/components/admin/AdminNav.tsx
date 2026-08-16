"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ADMIN_PAGES } from "@/components/admin/adminPages";

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-wrap gap-2">
      {ADMIN_PAGES.map(([href, label]) => (
        <Link
          key={href}
          href={href}
          className={`rounded-full px-3 py-1 text-xs ${
            pathname === href || (href !== "/admin" && pathname.startsWith(href))
              ? "bg-teal-400 text-slate-950"
              : "bg-[var(--panel-2)] text-slate-200"
          }`}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
