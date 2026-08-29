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
  { id: "home", group: "Home dashboard", label: "Home — open dashboard" },
  { id: "home.notifications", group: "Home dashboard", label: "Home — bell notifications" },
  { id: "home.actions", group: "Home dashboard", label: "Home — app actions panel" },
  { id: "estimates.list", group: "Navigation & read", label: "Estimates — list & open" },
  { id: "estimates.create", group: "Estimate authoring", label: "New estimate / create" },
  { id: "estimates.edit", group: "Estimate authoring", label: "Edit draft" },
  { id: "estimates.submit", group: "Estimate authoring", label: "Submit for review" },
  { id: "estimates.actuals", group: "Estimate authoring", label: "Record actuals (post-delivery)" },
  { id: "estimates.review", group: "Review & approval", label: "Mark reviewed" },
  { id: "estimates.approve", group: "Review & approval", label: "Approve / reject" },
  { id: "estimates.reopen", group: "Review & approval", label: "Reopen / unlock approved" },
  { id: "estimates.cancel", group: "Estimate lifecycle", label: "Cancel CR (governed, mandatory reason)" },
  { id: "estimates.archive", group: "Estimate lifecycle", label: "Archive / soft-delete" },
  { id: "estimates.delete", group: "Estimate lifecycle", label: "Delete (hard)" },
  { id: "estimates.export", group: "Estimate lifecycle", label: "Export estimate / data" },
  { id: "portfolio.view", group: "Portfolio, tools & analytics", label: "Portfolio roll-up & CR register" },
  { id: "portfolio.budget", group: "Portfolio, tools & analytics", label: "Crew budgets (legacy portfolio budget grant)" },
  { id: "whatIf", group: "Portfolio, tools & analytics", label: "What-If / Scenarios tab" },
  { id: "calibration.view", group: "Portfolio, tools & analytics", label: "Calibration (view)" },
  { id: "calibration.apply", group: "Portfolio, tools & analytics", label: "Apply calibration → config" },
  { id: "analytics", group: "Portfolio, tools & analytics", label: "Analytics dashboards" },
  { id: "config.teams", group: "Configuration", label: "Teams & roster" },
  { id: "config.rates", group: "Configuration", label: "Rate cards (cost / team cost)" },
  { id: "config.mappings", group: "Configuration", label: "Mappings & thresholds" },
  { id: "config.users", group: "Configuration", label: "User & role management" },
  { id: "config.rbac", group: "Configuration", label: "RBAC matrix" },
  { id: "org.setup", group: "Organisation", label: "Organisation setup (tree & seats)" },
  { id: "org.budget", group: "Organisation", label: "Crew yearly budgets" },
  {
    id: "scope.allTeams",
    group: "Record scope",
    label: "All teams — see records across every team",
  },
  {
    id: "scope.writeAnyOnTeam",
    group: "Record scope",
    label: "Write any on team — edit teammates’ estimates (not only own)",
  },
] as const;

export type FeatureId = (typeof FEATURES)[number]["id"];

function cell(spec: Partial<Record<AppRole, Access>>): Record<AppRole, Access> {
  return Object.fromEntries(ROLES.map((role) => [role, spec[role] ?? null])) as Record<AppRole, Access>;
}

const RW = "RW" as const;
const R = "R" as const;

/** Access matrix from Estimation_App_RBAC_Matrix. Blank = deny. Factory default; live grants are stored in the database. */
export const DEFAULT_RBAC: Record<FeatureId, Record<AppRole, Access>> = {
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
  "home.notifications": cell({
    ADMINISTRATOR: R,
    REQUESTER: R,
    ESTIMATOR: R,
    REVIEWER: R,
    APPROVER: R,
    DELIVERY_LEAD: R,
    FINANCE: R,
    VIEWER: R,
  }),
  "home.actions": cell({
    ADMINISTRATOR: R,
    REQUESTER: R,
    ESTIMATOR: R,
    REVIEWER: R,
    APPROVER: R,
    DELIVERY_LEAD: R,
    FINANCE: R,
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
  // DEC-008 D6: conservative default — governance roles only. Admin reconfigures via the matrix.
  "estimates.cancel": cell({
    ADMINISTRATOR: RW,
    DELIVERY_LEAD: RW,
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
  "org.setup": cell({
    ADMINISTRATOR: RW,
    DELIVERY_LEAD: R,
  }),
  "org.budget": cell({
    ADMINISTRATOR: RW,
    FINANCE: RW,
    DELIVERY_LEAD: RW,
  }),
  /** Cross-team visibility. Blank = own team only (via user.teamId). */
  "scope.allTeams": cell({
    ADMINISTRATOR: R,
  }),
  /**
   * When blank, write actions (edit/submit/calculate/override) are limited to records
   * the user authored. R or RW lifts that to any visible team record — still needs the
   * matching function grant (e.g. estimates.edit).
   */
  "scope.writeAnyOnTeam": cell({
    ADMINISTRATOR: R,
    REVIEWER: R,
    APPROVER: R,
    FINANCE: R,
    VIEWER: R,
  }),
};

export const RBAC = DEFAULT_RBAC;

export type RbacMatrix = Record<FeatureId, Record<AppRole, Access>>;

export const GOVERNANCE_RULES = [
  "Record scope is matrix-driven: scope.allTeams and scope.writeAnyOnTeam (Access → RBAC).",
  "Default: Requester / Estimator / Delivery Lead have no write-any-on-team — they write only records they authored; they may read others on their team.",
  "Default: Admin has all-teams; Reviewer / Approver / Finance / Viewer may write any on their team when they also have the function grant.",
  "No self-review / self-approval — including Admin — enforced on the record (not matrix).",
  "Two-person rule: Mark reviewed and Approve/reject must be different users (not matrix).",
  "Reopening an approved estimate clears review and approval.",
  "Server-side enforcement: hiding a control is not a permission.",
  "Deny by default: no explicit grant means no access.",
];

export function emptyMatrix(): RbacMatrix {
  return structuredClone(DEFAULT_RBAC);
}

export function normalizeMatrix(input: unknown): RbacMatrix {
  const next = emptyMatrix();
  if (!input || typeof input !== "object") return next;
  const raw = input as Record<string, Record<string, unknown>>;
  for (const feature of FEATURES) {
    const row = raw[feature.id];
    if (!row || typeof row !== "object") continue;
    for (const role of ROLES) {
      const value = row[role];
      next[feature.id][role] = value === "RW" || value === "R" ? value : null;
    }
  }
  return next;
}

export function accessFor(
  role: string | null | undefined,
  feature: FeatureId,
  matrix: RbacMatrix = DEFAULT_RBAC,
): Access {
  if (!role || !ROLES.includes(role as AppRole)) return null;
  return matrix[feature]?.[role as AppRole] ?? null;
}

export function can(
  role: string | null | undefined,
  feature: FeatureId,
  mode: "R" | "RW" = "R",
  matrix: RbacMatrix = DEFAULT_RBAC,
): boolean {
  const access = accessFor(role, feature, matrix);
  if (!access) return false;
  if (mode === "R") return access === "R" || access === "RW";
  return access === "RW";
}

/** True when the role may see estimates/teams across every team (matrix: scope.allTeams). */
export function seesAllTeams(
  role: string | null | undefined,
  matrix: RbacMatrix = DEFAULT_RBAC,
): boolean {
  return can(role, "scope.allTeams", "R", matrix);
}

/**
 * True when write actions are limited to estimates the user authored.
 * Inverse of matrix grant scope.writeAnyOnTeam.
 */
export function writesOwnRecordsOnly(
  role: string | null | undefined,
  matrix: RbacMatrix = DEFAULT_RBAC,
): boolean {
  return !can(role, "scope.writeAnyOnTeam", "R", matrix);
}

export const PATH_FEATURES: { prefix: string; feature: FeatureId; mode: "R" | "RW" }[] = [
  { prefix: "/admin/users", feature: "config.users", mode: "R" },
  { prefix: "/admin/rbac", feature: "config.rbac", mode: "R" },
  { prefix: "/admin/organisation", feature: "org.setup", mode: "R" },
  { prefix: "/admin/crew-budgets", feature: "org.budget", mode: "R" },
  { prefix: "/admin/team-composition", feature: "config.teams", mode: "R" },
  { prefix: "/teams", feature: "config.teams", mode: "R" },
  { prefix: "/admin/cost-mapping", feature: "config.rates", mode: "R" },
  { prefix: "/admin/team-cost-mapping", feature: "config.rates", mode: "R" },
  { prefix: "/admin/daily-rates", feature: "config.rates", mode: "R" },
  { prefix: "/admin/issue-mapping", feature: "config.mappings", mode: "R" },
  { prefix: "/admin/epic-mapping", feature: "config.mappings", mode: "R" },
  { prefix: "/admin/release-quarters", feature: "config.mappings", mode: "R" },
  { prefix: "/admin/readiness-criteria", feature: "config.mappings", mode: "R" },
  { prefix: "/admin/complexity-dimensions", feature: "config.mappings", mode: "R" },
  { prefix: "/admin/complexity-mapping", feature: "config.mappings", mode: "R" },
  { prefix: "/admin/resource-mapping", feature: "config.mappings", mode: "R" },
  { prefix: "/admin/estimation-config", feature: "config.mappings", mode: "R" },
  { prefix: "/what-if", feature: "whatIf", mode: "R" },
  { prefix: "/calibration", feature: "calibration.view", mode: "R" },
  { prefix: "/analytics", feature: "analytics", mode: "R" },
  { prefix: "/portfolio", feature: "portfolio.view", mode: "R" },
  { prefix: "/estimates/new", feature: "estimates.create", mode: "RW" },
  { prefix: "/estimates", feature: "estimates.list", mode: "R" },
  { prefix: "/home", feature: "home", mode: "R" },
];

export function featureForPath(pathname: string): { feature: FeatureId; mode: "R" | "RW" } | null {
  const hit = PATH_FEATURES.find(
    (row) => pathname === row.prefix || pathname.startsWith(`${row.prefix}/`),
  );
  return hit ? { feature: hit.feature, mode: hit.mode } : null;
}

export function canAccessPath(
  role: string | null | undefined,
  pathname: string,
  matrix: RbacMatrix = DEFAULT_RBAC,
): boolean {
  if (!role) return false;
  if (pathname === "/admin" || pathname === "/admin/") {
    return (
      can(role, "config.teams", "R", matrix) ||
      can(role, "config.rates", "R", matrix) ||
      can(role, "config.mappings", "R", matrix) ||
      can(role, "config.users", "R", matrix) ||
      can(role, "config.rbac", "R", matrix) ||
      can(role, "org.setup", "R", matrix) ||
      can(role, "org.budget", "R", matrix)
    );
  }
  const mapped = featureForPath(pathname);
  if (!mapped) return can(role, "home", "R", matrix);
  return can(role, mapped.feature, mapped.mode, matrix);
}
