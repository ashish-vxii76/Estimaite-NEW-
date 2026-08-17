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

export const ROLE_LABELS: Record<string, string> = {
  ADMINISTRATOR: "Admin",
  REQUESTER: "Requester",
  ESTIMATOR: "Estimator",
  REVIEWER: "Reviewer",
  APPROVER: "Approver",
  DELIVERY_LEAD: "Delivery Lead",
  FINANCE: "Finance",
  VIEWER: "Viewer",
};

export function roleLabel(role: string | null | undefined): string {
  if (!role) return "Viewer";
  return ROLE_LABELS[role] ?? role.replaceAll("_", " ");
}

export function welcomeLine(name: string | null | undefined, role: string | null | undefined): string {
  const displayName = name?.trim() || "there";
  return `Welcome ${displayName} (${roleLabel(role)})`;
}

export const ESTIMATE_CREATE_ROLES: AppRole[] = [
  "ADMINISTRATOR",
  "REQUESTER",
  "ESTIMATOR",
  "DELIVERY_LEAD",
];

export const PORTFOLIO_ROLES: AppRole[] = [
  "ADMINISTRATOR",
  "FINANCE",
  "DELIVERY_LEAD",
  "APPROVER",
  "REVIEWER",
  "VIEWER",
  "ESTIMATOR",
];

export const SCENARIO_ROLES: AppRole[] = [
  "ADMINISTRATOR",
  "ESTIMATOR",
  "DELIVERY_LEAD",
  "REVIEWER",
  "APPROVER",
];

export const LEARNING_ROLES: AppRole[] = [
  "ADMINISTRATOR",
  "FINANCE",
  "DELIVERY_LEAD",
  "REVIEWER",
  "APPROVER",
];

export const ADMIN_ROLES: AppRole[] = ["ADMINISTRATOR", "FINANCE"];
export const USER_ADMIN_ROLES: AppRole[] = ["ADMINISTRATOR"];

export function hasRole(role: string | null | undefined, allowed: string[]): boolean {
  if (!role) return false;
  if (role === "ADMINISTRATOR") return true;
  return allowed.includes(role);
}

/** First matching prefix wins; more specific prefixes must be listed first. */
export const ROUTE_POLICIES: { prefix: string; roles: string[] }[] = [
  { prefix: "/admin/users", roles: USER_ADMIN_ROLES },
  { prefix: "/admin", roles: ADMIN_ROLES },
  { prefix: "/teams", roles: ADMIN_ROLES },
  { prefix: "/what-if", roles: SCENARIO_ROLES },
  { prefix: "/calibration", roles: LEARNING_ROLES },
  { prefix: "/analytics", roles: LEARNING_ROLES },
  { prefix: "/portfolio", roles: PORTFOLIO_ROLES },
  { prefix: "/estimates/new", roles: ESTIMATE_CREATE_ROLES },
  { prefix: "/estimates", roles: ROLES as unknown as string[] },
  { prefix: "/", roles: ROLES as unknown as string[] },
];

export function canAccessPath(role: string | null | undefined, pathname: string): boolean {
  if (!role) return false;
  if (role === "ADMINISTRATOR") return true;
  const policy = ROUTE_POLICIES.find(
    (row) => pathname === row.prefix || pathname.startsWith(`${row.prefix}/`) || pathname.startsWith(`${row.prefix}?`),
  );
  if (!policy) return true;
  if (policy.prefix === "/" && pathname !== "/") {
    const nested = ROUTE_POLICIES.find(
      (row) => row.prefix !== "/" && (pathname === row.prefix || pathname.startsWith(`${row.prefix}/`)),
    );
    if (nested) return nested.roles.includes(role);
  }
  return policy.roles.includes(role);
}
