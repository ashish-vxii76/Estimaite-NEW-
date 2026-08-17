import Link from "next/link";

const CLUSTERS = [
  {
    title: "Size",
    preview: "Issue XS = 1 SP · Epic cost deferred until stories exist.",
    links: [
      ["/admin/complexity-mapping", "Complexity mapping"],
      ["/admin/issue-mapping", "Issue mapping"],
      ["/admin/epic-mapping", "Epic mapping"],
      ["/admin/estimation-config", "Estimation config"],
    ],
  },
  {
    title: "People",
    preview: "Teams, composition, and seniority capacity drive sprints — not cost first.",
    links: [
      ["/teams", "Teams"],
      ["/admin/team-composition", "Team composition"],
      ["/admin/resource-mapping", "Resource mapping"],
    ],
  },
  {
    title: "Money",
    preview: "CHF sprint and daily rates. Project override is optional and audited.",
    links: [
      ["/admin/cost-mapping", "Location sprint rates"],
      ["/admin/team-cost-mapping", "Team sprint rates"],
      ["/admin/daily-rates", "Location daily rates"],
    ],
  },
  {
    title: "Access",
    preview: "Login credentials and roles. Menus follow the selected profile.",
    links: [["/admin/users", "Login credentials"]],
  },
] as const;

export default function AdminHomePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-[var(--navy)]">Mapping studio</h1>
        <p className="mt-1 max-w-2xl text-sm text-[var(--muted)]">
          Configure Size, People, and Money as clusters. Publishing still writes a new configuration
          version the engine uses — formulas do not change in the UI.
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {CLUSTERS.map((cluster) => (
          <section key={cluster.title} className="card p-5">
            <p className="kicker">{cluster.title}</p>
            <p className="mt-2 text-sm text-[var(--muted)]">{cluster.preview}</p>
            <ul className="mt-4 space-y-2">
              {cluster.links.map(([href, label]) => (
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
    </div>
  );
}
