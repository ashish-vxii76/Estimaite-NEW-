import { ROLES, can, type AppRole } from "@/lib/rbac";

export { ROLES, type AppRole };
export { canAccessPath } from "@/lib/rbac";

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

export function welcomeLine(
  name: string | null | undefined,
  role: string | null | undefined,
  teamName?: string | null,
): string {
  const displayName = name?.trim() || "there";
  const context = teamName ? `${teamName} · ${roleLabel(role)}` : roleLabel(role);
  return `Welcome ${displayName} (${context})`;
}

export const ESTIMATE_CREATE_ROLES = ROLES.filter((role) => can(role, "estimates.create", "RW"));
export const PORTFOLIO_ROLES = ROLES.filter((role) => can(role, "portfolio.view"));
export const SCENARIO_ROLES = ROLES.filter((role) => can(role, "whatIf"));
export const LEARNING_ROLES = ROLES.filter((role) => can(role, "calibration.view"));
export const ADMIN_ROLES = ROLES.filter(
  (role) => can(role, "config.teams") || can(role, "config.rates") || can(role, "config.mappings"),
);
export const USER_ADMIN_ROLES = ROLES.filter((role) => can(role, "config.users", "RW"));

export function hasRole(role: string | null | undefined, allowed: string[]): boolean {
  if (!role) return false;
  return allowed.includes(role);
}
