import Link from "next/link";
import { auth } from "@/auth";
import { can } from "@/lib/access";

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
    title: "People",
    preview: "Teams, composition, and seniority capacity drive sprints — not cost first.",
    feature: "config.teams" as const,
    links: [
      ["/teams", "Teams"],
      ["/admin/team-composition", "Team composition"],
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
  const visible = CLUSTERS.filter((cluster) => {
    if (cluster.feature === "config.users") return can(role, "config.users") || can(role, "config.rbac");
    if (cluster.title === "People") return can(role, "config.teams") || can(role, "config.mappings");
    return can(role, cluster.feature);
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-[var(--navy)]">Administration</h1>
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
