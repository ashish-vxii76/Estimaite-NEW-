import { can, type FeatureId, type RbacMatrix } from "@/lib/rbac";
import { ESTIMATE_CREATE_ROLES } from "@/lib/roles";

export type NavNode = {
  id: string;
  label: string;
  href?: string;
  feature?: FeatureId;
  createHref?: string;
  createLabel?: string;
  createRoles?: string[];
  children?: NavNode[];
};

export const NAV_TREE: NavNode[] = [
  { id: "home", label: "Home", href: "/", feature: "home" },
  {
    id: "estimates",
    label: "Estimates",
    href: "/estimates",
    feature: "estimates.list",
    createHref: "/estimates/new",
    createLabel: "Create new estimate",
    createRoles: ESTIMATE_CREATE_ROLES,
    children: [
      {
        id: "new-estimate",
        label: "New estimate",
        href: "/estimates/new",
        feature: "estimates.create",
      },
      { id: "estimates-all", label: "All estimates", href: "/estimates", feature: "estimates.list" },
      { id: "estimates-drafts", label: "Drafts", href: "/estimates?status=DRAFT", feature: "estimates.list" },
      {
        id: "estimates-review",
        label: "Ready for review",
        href: "/estimates?status=READY_FOR_REVIEW",
        feature: "estimates.list",
      },
      {
        id: "estimates-approved",
        label: "Approved",
        href: "/estimates?status=APPROVED",
        feature: "estimates.list",
      },
      {
        id: "estimates-completed",
        label: "Completed",
        href: "/estimates?status=COMPLETED",
        feature: "estimates.list",
      },
    ],
  },
  {
    id: "portfolio",
    label: "Portfolio",
    href: "/portfolio",
    feature: "portfolio.view",
    children: [
      {
        id: "portfolio-rollup",
        label: "Roll-up & CR register",
        href: "/portfolio",
        feature: "portfolio.view",
      },
      {
        id: "portfolio-budget",
        label: "Budget",
        href: "/portfolio#budget",
        feature: "portfolio.budget",
      },
    ],
  },
  {
    id: "scenarios",
    label: "Scenarios",
    children: [{ id: "what-if", label: "What-If", href: "/what-if", feature: "whatIf" }],
  },
  {
    id: "learning",
    label: "Learning",
    children: [
      { id: "calibration", label: "Calibration", href: "/calibration", feature: "calibration.view" },
      { id: "analytics", label: "Analytics", href: "/analytics", feature: "analytics" },
    ],
  },
  {
    id: "administration",
    label: "Administration",
    href: "/admin",
    children: [
      { id: "admin-overview", label: "Overview", href: "/admin" },
      {
        id: "admin-access",
        label: "Access",
        children: [
          {
            id: "admin-users",
            label: "Login credentials",
            href: "/admin/users",
            feature: "config.users",
            createHref: "/admin/users",
            createLabel: "Create login",
            createRoles: ["ADMINISTRATOR"],
          },
          { id: "admin-rbac", label: "RBAC", href: "/admin/rbac", feature: "config.rbac" },
        ],
      },
      {
        id: "admin-org",
        label: "Organisation",
        children: [
          {
            id: "teams",
            label: "Teams",
            href: "/teams",
            feature: "config.teams",
            createHref: "/teams/new",
            createLabel: "Create new team",
            createRoles: ["ADMINISTRATOR"],
          },
          {
            id: "team-composition",
            label: "Team composition",
            href: "/admin/team-composition",
            feature: "config.teams",
          },
        ],
      },
      {
        id: "admin-size",
        label: "Size & complexity",
        children: [
          { id: "issue-mapping", label: "Issue mapping", href: "/admin/issue-mapping", feature: "config.mappings" },
          { id: "epic-mapping", label: "Epic mapping", href: "/admin/epic-mapping", feature: "config.mappings" },
          {
            id: "complexity-mapping",
            label: "Complexity mapping",
            href: "/admin/complexity-mapping",
            feature: "config.mappings",
          },
        ],
      },
      {
        id: "admin-people",
        label: "People & capacity",
        children: [
          {
            id: "resource-mapping",
            label: "Resource mapping",
            href: "/admin/resource-mapping",
            feature: "config.mappings",
          },
        ],
      },
      {
        id: "admin-commercial",
        label: "Commercial",
        children: [
          { id: "cost-mapping", label: "Location sprint rates", href: "/admin/cost-mapping", feature: "config.rates" },
          { id: "team-cost-mapping", label: "Team sprint rates", href: "/admin/team-cost-mapping", feature: "config.rates" },
          { id: "daily-rates", label: "Location daily rates", href: "/admin/daily-rates", feature: "config.rates" },
        ],
      },
      {
        id: "admin-engine",
        label: "Engine",
        children: [
          {
            id: "estimation-config",
            label: "Estimation config",
            href: "/admin/estimation-config",
            feature: "config.mappings",
          },
        ],
      },
    ],
  },
];

export function canSeeNav(node: NavNode, role: string, matrix?: RbacMatrix): boolean {
  if (node.feature) return can(role, node.feature, "R", matrix);
  if (node.children?.length) return node.children.some((child) => canSeeNav(child, role, matrix));
  if (node.href === "/admin") {
    return (
      can(role, "config.teams", "R", matrix) ||
      can(role, "config.rates", "R", matrix) ||
      can(role, "config.mappings", "R", matrix) ||
      can(role, "config.users", "R", matrix) ||
      can(role, "config.rbac", "R", matrix)
    );
  }
  return true;
}

export function canCreate(node: NavNode, role: string, matrix?: RbacMatrix): boolean {
  if (!node.createHref) return false;
  if (node.id === "estimates") return can(role, "estimates.create", "RW", matrix);
  if (node.id === "admin-users") return can(role, "config.users", "RW", matrix);
  if (node.id === "teams") return can(role, "config.teams", "RW", matrix);
  if (!node.createRoles || node.createRoles.length === 0) return true;
  return node.createRoles.includes(role);
}

export function pathOf(href: string): { pathname: string; search: string; hash: string } {
  const url = new URL(href, "http://local.invalid");
  return { pathname: url.pathname, search: url.search, hash: url.hash };
}

export function isNodeActive(
  node: NavNode,
  pathname: string,
  search: string,
  hash: string,
): boolean {
  if (!node.href) return false;
  const target = pathOf(node.href);
  if (target.hash) {
    return pathname === target.pathname && hash === target.hash;
  }
  if (node.href === "/") return pathname === "/";
  if (node.id === "estimates") {
    return pathname === "/estimates" || pathname.startsWith("/estimates/");
  }
  if (node.id === "portfolio") {
    return pathname === "/portfolio";
  }
  if (node.id === "administration") {
    return pathname === "/admin" || pathname.startsWith("/admin/") || pathname.startsWith("/teams");
  }
  if (target.search) {
    return pathname === target.pathname && normalizeSearch(search) === normalizeSearch(target.search);
  }
  if (pathname === "/estimates" && node.href === "/estimates") {
    return !search || search === "?";
  }
  if (node.href === "/portfolio") {
    return pathname === "/portfolio" && hash !== "#budget";
  }
  return pathname === target.pathname && !target.search;
}

function normalizeSearch(search: string) {
  const value = search.startsWith("?") ? search.slice(1) : search;
  return value;
}

export function containsActive(
  node: NavNode,
  pathname: string,
  search: string,
  hash: string,
): boolean {
  if (isNodeActive(node, pathname, search, hash)) return true;
  return (node.children ?? []).some((child) => containsActive(child, pathname, search, hash));
}
