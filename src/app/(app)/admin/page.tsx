import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { can, isAdminTier } from "@/lib/access";
import { fromSession } from "@/lib/scope";
import { resolveCrewScope } from "@/lib/crewScope";

const CLUSTERS = [
  {
    title: "Access",
    preview: "Who can sign in, which role they hold, which team they belong to, and the RBAC grid (functions + record scope).",
    feature: "config.users" as const,
    links: [
      ["/admin/users", "Login credentials"],
      ["/admin/rbac", "RBAC matrix"],
    ],
  },
  {
    title: "Organisation",
    preview:
      "Company → Division → Sub-division → Stream → Crew → Pod. Yearly CHF budgets sit on Crews; parents roll up as sums. Programme / Project stay free text beside the cascade.",
    feature: "org.setup" as const,
    links: [
      ["/admin/organisation", "Organisation setup"],
      ["/admin/crew-budgets", "Crew yearly budgets"],
    ],
  },
  {
    title: "Lists & catalogues",
    preview:
      "User-editable lists that feed Ready / Size / Plan dropdowns and Home filters. Change labels here without code deploys.",
    feature: "config.mappings" as const,
    links: [
      ["/admin/release-quarters", "Release quarters"],
      ["/admin/readiness-criteria", "Definition of Ready"],
      ["/admin/complexity-dimensions", "Complexity dimensions (Size 1–5)"],
      ["/admin/resource-mapping", "Resource levels (Dev/QA seniority)"],
    ],
  },
  {
    title: "Size mappings",
    preview: "Index bands, Issue SP and Epic ROM tables. Issue XS = 1 SP · Epic cost deferred until stories exist.",
    feature: "config.mappings" as const,
    links: [
      ["/admin/complexity-mapping", "Complexity mapping"],
      ["/admin/issue-mapping", "Issue mapping"],
      ["/admin/epic-mapping", "Epic mapping"],
      ["/admin/estimation-config", "Engine thresholds"],
    ],
  },
  {
    title: "Money",
    preview: "CHF sprint and daily rates. Project override is optional and audited.",
    feature: "config.rates" as const,
    links: [
      ["/admin/cost-mapping", "Location sprint rates"],
      ["/admin/team-cost-mapping", "Team sprint rates"],
      ["/admin/daily-rates", "Location daily rates"],
    ],
  },
] as const;

export default async function AdminHomePage() {
  const session = await auth();
  const role = session?.user.role;
  // DEC-016: the Administration section is admin-only (App/Org/Crew tier). Deny by default.
  if (!isAdminTier(role)) redirect("/home");

  // Which tier is this admin operating at? Driven by the scope of their active role grant, not a
  // separate role: App = sees everything; otherwise the Company/Crew their grant is locked to.
  const scope = await resolveCrewScope(fromSession(session!.user));
  const isAppAdmin = can(role, "config.rbac", "RW") && scope.adminAll;
  const tierLabel = isAppAdmin
    ? "App Admin"
    : scope.activeScopeType === "COMPANY"
      ? "Org Admin"
      : scope.crews.length > 0 || scope.activeScopeType === "CREW"
        ? "Crew Admin"
        : "Admin";
  const scopeLabel = scope.adminAll ? "all companies & crews" : scope.activeScopeName;

  const visible = CLUSTERS.filter((cluster) => {
    if (cluster.feature === "config.users") return can(role, "config.users") || can(role, "config.rbac");
    if (cluster.title === "Organisation") {
      return (
        can(role, "org.setup") ||
        can(role, "org.budget") ||
        can(role, "config.teams")
      );
    }
    return can(role, cluster.feature);
  });

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-display text-2xl font-semibold text-[var(--navy)]">Administration</h1>
          <span className="rounded-full bg-[var(--panel-2)] px-2.5 py-0.5 text-xs font-medium text-[var(--navy)]">
            {tierLabel} · {scopeLabel}
          </span>
        </div>
        <p className="mt-1 max-w-2xl text-sm text-[var(--muted)]">
          Mapping studio plus access control. Open <Link href="/admin/rbac" className="underline">RBAC</Link>{" "}
          to edit RW / R / blank per role. Lists &amp; catalogues hold the dropdown values estimators see
          on Ready / Size / Plan. Engine formulas stay fixed in code.
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {visible.map((cluster) => (
          <section key={cluster.title} className="card p-5">
            <p className="kicker">{cluster.title}</p>
            <p className="mt-2 text-sm text-[var(--muted)]">{cluster.preview}</p>
            <ul className="mt-4 space-y-2">
              {cluster.links
                .filter(([href]) => {
                  if (href === "/admin/rbac") return can(role, "config.rbac");
                  if (href === "/admin/users") return can(role, "config.users");
                  if (href === "/admin/organisation") return can(role, "org.setup");
                  if (href === "/admin/crew-budgets") return can(role, "org.budget");
                  if (href.startsWith("/teams") || href.includes("composition")) return can(role, "config.teams");
                  if (href.includes("cost") || href.includes("daily")) return can(role, "config.rates");
                  if (href.includes("resource-mapping")) return can(role, "config.mappings");
                  return can(role, "config.mappings");
                })
                .map(([href, label]) => (
                  <li key={href}>
                    <Link href={href} className="text-sm font-medium text-[var(--navy)] underline">
                      {label}
                    </Link>
                  </li>
                ))}
            </ul>
          </section>
        ))}
        {role === "ADMINISTRATOR" ? (
          <section className="card p-5">
            <p className="kicker">Governance</p>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Tamper-evident audit trail (hash-chained). The export&apos;s first line reports the
              chain-integrity verdict, so a reviewer can see at a glance whether it is untampered.
            </p>
            <ul className="mt-4 space-y-2">
              <li>
                <a
                  href="/api/admin/audit/export"
                  download
                  className="text-sm font-medium text-[var(--navy)] underline"
                >
                  Export audit trail (CSV)
                </a>
              </li>
            </ul>
          </section>
        ) : null}
      </div>
      <section className="card space-y-2 p-5 text-sm text-[var(--muted)]">
        <p className="font-medium text-[var(--navy)]">What stays code-only</p>
        <p>
          Estimation formulas, stance ±1 T-shirt rules, planning/costing enums (Team vs Location,
          Resource- vs Sprint-constrained), work item types (Issue / Epic), and governance decision
          codes are product rules — not label catalogues. Change those only via a product release.
        </p>
      </section>
    </div>
  );
}
