export const ROLES = [
  "ADMINISTRATOR",
  "REQUESTER",
  "ESTIMATOR",
  "REVIEWER",
  "APPROVER",
  "DELIVERY_LEAD",
  "FINANCE",
  "VIEWER",
] as const;

export type AppRole = (typeof ROLES)[number];

export type Access = "RW" | "R" | null;

export const FEATURES = [
  { id: "home", group: "Navigation & read", label: "Home" },
  { id: "estimates.list", group: "Navigation & read", label: "Estimates — list & open" },
  { id: "estimates.create", group: "Estimate authoring", label: "New estimate / create" },
  { id: "estimates.edit", group: "Estimate authoring", label: "Edit draft" },
  { id: "estimates.submit", group: "Estimate authoring", label: "Submit for review" },
  { id: "estimates.actuals", group: "Estimate authoring", label: "Record actuals (post-delivery)" },
  { id: "estimates.review", group: "Review & approval", label: "Mark reviewed" },
  { id: "estimates.approve", group: "Review & approval", label: "Approve / reject" },
  { id: "estimates.reopen", group: "Review & approval", label: "Reopen / unlock approved" },
  { id: "estimates.archive", group: "Estimate lifecycle", label: "Archive / soft-delete" },
  { id: "estimates.delete", group: "Estimate lifecycle", label: "Delete (hard)" },
  { id: "estimates.export", group: "Estimate lifecycle", label: "Export estimate / data" },
  { id: "portfolio.view", group: "Portfolio, tools & analytics", label: "Portfolio roll-up & CR register" },
  { id: "portfolio.budget", group: "Portfolio, tools & analytics", label: "Portfolio budget (set)" },
  { id: "whatIf", group: "Portfolio, tools & analytics", label: "What-If optimiser" },
  { id: "calibration.view", group: "Portfolio, tools & analytics", label: "Calibration (view)" },
  { id: "calibration.apply", group: "Portfolio, tools & analytics", label: "Apply calibration → config" },
  { id: "analytics", group: "Portfolio, tools & analytics", label: "Analytics dashboards" },
  { id: "config.teams", group: "Configuration", label: "Teams & roster" },
  { id: "config.rates", group: "Configuration", label: "Rate cards (cost / team cost)" },
  { id: "config.mappings", group: "Configuration", label: "Mappings & thresholds" },
  { id: "config.users", group: "Configuration", label: "User & role management" },
  { id: "config.rbac", group: "Configuration", label: "RBAC matrix" },
] as const;

export type FeatureId = (typeof FEATURES)[number]["id"];

function cell(spec: Partial<Record<AppRole, Access>>): Record<AppRole, Access> {
  return Object.fromEntries(ROLES.map((role) => [role, spec[role] ?? null])) as Record<AppRole, Access>;
}

const RW = "RW" as const;
const R = "R" as const;

/** Access matrix from Estimation_App_RBAC_Matrix. Blank = deny. */
export const RBAC: Record<FeatureId, Record<AppRole, Access>> = {
  home: cell({
    ADMINISTRATOR: R,
    REQUESTER: R,
    ESTIMATOR: R,
    REVIEWER: R,
    APPROVER: R,
    DELIVERY_LEAD: R,
    FINANCE: R,
    VIEWER: R,
  }),
  "estimates.list": cell({
    ADMINISTRATOR: R,
    REQUESTER: R,
    ESTIMATOR: R,
    REVIEWER: R,
    APPROVER: R,
    DELIVERY_LEAD: R,
    FINANCE: R,
    VIEWER: R,
  }),
  "estimates.create": cell({
    ADMINISTRATOR: RW,
    REQUESTER: RW,
    ESTIMATOR: RW,
    DELIVERY_LEAD: RW,
  }),
  "estimates.edit": cell({
    ADMINISTRATOR: RW,
    REQUESTER: RW,
    ESTIMATOR: RW,
    DELIVERY_LEAD: RW,
  }),
  "estimates.submit": cell({
    ADMINISTRATOR: RW,
    REQUESTER: RW,
    ESTIMATOR: RW,
    DELIVERY_LEAD: RW,
  }),
  "estimates.actuals": cell({
    ADMINISTRATOR: RW,
    ESTIMATOR: RW,
    DELIVERY_LEAD: RW,
  }),
  "estimates.review": cell({
    ADMINISTRATOR: RW,
    REVIEWER: RW,
  }),
  "estimates.approve": cell({
    ADMINISTRATOR: RW,
    APPROVER: RW,
  }),
  "estimates.reopen": cell({
    ADMINISTRATOR: RW,
    APPROVER: RW,
  }),
  "estimates.archive": cell({
    ADMINISTRATOR: RW,
    ESTIMATOR: RW,
    DELIVERY_LEAD: RW,
  }),
  "estimates.delete": cell({
    ADMINISTRATOR: RW,
  }),
  "estimates.export": cell({
    ADMINISTRATOR: RW,
    DELIVERY_LEAD: RW,
    FINANCE: RW,
  }),
  "portfolio.view": cell({
    ADMINISTRATOR: R,
    ESTIMATOR: R,
    REVIEWER: R,
    APPROVER: R,
    DELIVERY_LEAD: R,
    FINANCE: R,
    VIEWER: R,
  }),
  "portfolio.budget": cell({
    ADMINISTRATOR: RW,
    FINANCE: RW,
  }),
  whatIf: cell({
    ADMINISTRATOR: RW,
    ESTIMATOR: RW,
    REVIEWER: RW,
    APPROVER: RW,
    DELIVERY_LEAD: RW,
  }),
  "calibration.view": cell({
    ADMINISTRATOR: R,
    ESTIMATOR: R,
    REVIEWER: R,
    APPROVER: R,
    DELIVERY_LEAD: R,
    FINANCE: R,
  }),
  "calibration.apply": cell({
    ADMINISTRATOR: RW,
  }),
  analytics: cell({
    ADMINISTRATOR: R,
    ESTIMATOR: R,
    REVIEWER: R,
    APPROVER: R,
    DELIVERY_LEAD: R,
    FINANCE: R,
    VIEWER: R,
  }),
  "config.teams": cell({
    ADMINISTRATOR: RW,
    FINANCE: R,
  }),
  "config.rates": cell({
    ADMINISTRATOR: RW,
    DELIVERY_LEAD: R,
    FINANCE: R,
  }),
  "config.mappings": cell({
    ADMINISTRATOR: RW,
    ESTIMATOR: R,
    REVIEWER: R,
    APPROVER: R,
    DELIVERY_LEAD: R,
  }),
  "config.users": cell({
    ADMINISTRATOR: RW,
  }),
  "config.rbac": cell({
    ADMINISTRATOR: RW,
  }),
};

export const GOVERNANCE_RULES = [
  "Own-records scope: Requester, Estimator and Delivery Lead may write only records they authored; they may read others on their team.",
  "Admin, Reviewer and Approver act across all records on their team (Admin: all teams) within granted functions.",
  "No self-review / self-approval — including Admin — enforced on the record.",
  "Two-person rule: Mark reviewed and Approve/reject must be different users.",
  "Reopening an approved estimate clears review and approval.",
  "Server-side enforcement: hiding a control is not a permission.",
  "Deny by default: no explicit grant means no access.",
];

export function accessFor(role: string | null | undefined, feature: FeatureId): Access {
  if (!role || !ROLES.includes(role as AppRole)) return null;
  return RBAC[feature][role as AppRole];
}

export function can(role: string | null | undefined, feature: FeatureId, mode: "R" | "RW" = "R"): boolean {
  const access = accessFor(role, feature);
  if (!access) return false;
  if (mode === "R") return access === "R" || access === "RW";
  return access === "RW";
}

export function seesAllTeams(role: string | null | undefined): boolean {
  return role === "ADMINISTRATOR";
}

export function writesOwnRecordsOnly(role: string | null | undefined): boolean {
  return role === "REQUESTER" || role === "ESTIMATOR" || role === "DELIVERY_LEAD";
}

export const PATH_FEATURES: { prefix: string; feature: FeatureId; mode: "R" | "RW" }[] = [
  { prefix: "/admin/users", feature: "config.users", mode: "R" },
  { prefix: "/admin/rbac", feature: "config.rbac", mode: "R" },
  { prefix: "/admin/team-composition", feature: "config.teams", mode: "R" },
  { prefix: "/teams", feature: "config.teams", mode: "R" },
  { prefix: "/admin/cost-mapping", feature: "config.rates", mode: "R" },
  { prefix: "/admin/team-cost-mapping", feature: "config.rates", mode: "R" },
  { prefix: "/admin/daily-rates", feature: "config.rates", mode: "R" },
  { prefix: "/admin/issue-mapping", feature: "config.mappings", mode: "R" },
  { prefix: "/admin/epic-mapping", feature: "config.mappings", mode: "R" },
  { prefix: "/admin/complexity-mapping", feature: "config.mappings", mode: "R" },
  { prefix: "/admin/resource-mapping", feature: "config.mappings", mode: "R" },
  { prefix: "/admin/estimation-config", feature: "config.mappings", mode: "R" },
  { prefix: "/what-if", feature: "whatIf", mode: "R" },
  { prefix: "/calibration", feature: "calibration.view", mode: "R" },
  { prefix: "/analytics", feature: "analytics", mode: "R" },
  { prefix: "/portfolio", feature: "portfolio.view", mode: "R" },
  { prefix: "/estimates/new", feature: "estimates.create", mode: "RW" },
  { prefix: "/estimates", feature: "estimates.list", mode: "R" },
  { prefix: "/", feature: "home", mode: "R" },
];

export function featureForPath(pathname: string): { feature: FeatureId; mode: "R" | "RW" } | null {
  const hit = PATH_FEATURES.find(
    (row) => pathname === row.prefix || pathname.startsWith(`${row.prefix}/`),
  );
  return hit ? { feature: hit.feature, mode: hit.mode } : null;
}

export function canAccessPath(role: string | null | undefined, pathname: string): boolean {
  if (!role) return false;
  if (pathname === "/admin" || pathname === "/admin/") {
    return (
      can(role, "config.teams") ||
      can(role, "config.rates") ||
      can(role, "config.mappings") ||
      can(role, "config.users") ||
      can(role, "config.rbac")
    );
  }
  const mapped = featureForPath(pathname);
  if (!mapped) return can(role, "home");
  return can(role, mapped.feature, mapped.mode);
}
