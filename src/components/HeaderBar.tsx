"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/ThemeToggle";

/** Human labels for the first two path segments; falls back to Title Case. */
const LABELS: Record<string, string> = {
  home: "Home",
  estimates: "Estimates",
  new: "New",
  portfolio: "Roll-up & CR register",
  analytics: "Analytics",
  calibration: "Calibration",
  configuration: "Configuration",
  "what-if": "Scenarios",
  admin: "Administration",
  teams: "Teams",
};

function titleCase(seg: string) {
  return seg.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function HeaderBar({ bell }: { bell?: React.ReactNode }) {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  // Keep breadcrumbs short: drop opaque ids (cuids / long tokens).
  const crumbs = segments
    .filter((s) => !(s.length > 16 || /^c[a-z0-9]{20,}$/.test(s)))
    .slice(0, 3)
    .map((seg, i, arr) => ({
      label: LABELS[seg] ?? titleCase(seg),
      href: "/" + arr.slice(0, i + 1).join("/"),
    }));

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-3 border-b border-[var(--line)] bg-[color-mix(in_srgb,var(--bg)_92%,transparent)] px-4 backdrop-blur md:px-8">
      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-sm">
        {crumbs.map((c, i) => (
          <span key={c.href} className="flex min-w-0 items-center gap-1.5">
            {i > 0 && <span className="text-[var(--muted)]">/</span>}
            {i === crumbs.length - 1 ? (
              <span className="truncate font-medium text-[var(--navy)]">{c.label}</span>
            ) : (
              <Link href={c.href} className="truncate text-[var(--muted)] hover:text-[var(--navy)]">
                {c.label}
              </Link>
            )}
          </span>
        ))}
      </nav>
      <div className="flex items-center gap-2">
        {bell}
        <ThemeToggle />
      </div>
    </header>
  );
}
