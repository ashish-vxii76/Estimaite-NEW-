import Link from "next/link";
import { signOut } from "@/auth";

const NAV = [
  ["/", "Dashboard"],
  ["/estimates", "Estimates"],
  ["/estimates/new", "New estimate"],
  ["/what-if", "What-If"],
  ["/teams", "Teams"],
  ["/analytics", "Analytics"],
  ["/configuration", "Configuration"],
];

export function AppShell({
  children,
  user,
}: {
  children: React.ReactNode;
  user: { name?: string | null; email?: string | null; role?: string };
}) {
  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 shrink-0 border-r border-[var(--line)] bg-[var(--panel)] p-5 md:block">
        <Link href="/" className="block">
          <p className="text-xs uppercase tracking-[0.22em] text-teal-300">Estimaite</p>
          <h1 className="mt-1 text-lg font-semibold">Estimation Platform</h1>
        </Link>
        <p className="mt-1 text-xs text-[var(--muted)]">Estimate → Plan → Govern → Measure</p>
        <nav className="mt-8 space-y-1">
          {NAV.map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className="block rounded-lg px-3 py-2 text-sm text-slate-200 hover:bg-[var(--panel-2)]"
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="mt-10 text-xs text-[var(--muted)]">
          <p>{user.name}</p>
          <p>{user.role}</p>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button className="mt-3 text-teal-300 underline">Sign out</button>
          </form>
        </div>
      </aside>
      <div className="flex-1">
        <header className="border-b border-[var(--line)] px-6 py-4 md:hidden">
          <p className="text-sm font-medium">Estimaite</p>
        </header>
        <main className="px-4 py-6 md:px-8">{children}</main>
      </div>
    </div>
  );
}
