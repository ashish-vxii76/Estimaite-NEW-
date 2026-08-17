import {
  ADMIN_ROLES,
  ESTIMATE_CREATE_ROLES,
  LEARNING_ROLES,
  PORTFOLIO_ROLES,
  SCENARIO_ROLES,
  USER_ADMIN_ROLES,
} from "@/lib/roles";

export type NavNode = {
  id: string;
  label: string;
  href?: string;
  roles?: string[];
  createHref?: string;
  createLabel?: string;
  createRoles?: string[];
  children?: NavNode[];
};

export const NAV_TREE: NavNode[] = [
  {
    id: "home",
    label: "Home",
    href: "/",
  },
  {
    id: "estimates",
    label: "Estimates",
    href: "/estimates",
    createHref: "/estimates/new",
    createLabel: "Create new estimate",
    createRoles: ESTIMATE_CREATE_ROLES,
    children: [
      {
        id: "new-estimate",
        label: "New estimate",
        href: "/estimates/new",
        roles: ESTIMATE_CREATE_ROLES,
      },
      { id: "estimates-all", label: "All estimates", href: "/estimates" },
      { id: "estimates-drafts", label: "Drafts", href: "/estimates?status=DRAFT" },
      {
        id: "estimates-review",
        label: "Ready for review",
        href: "/estimates?status=READY_FOR_REVIEW",
      },
      {
        id: "estimates-approved",
        label: "Approved",
        href: "/estimates?status=APPROVED",
      },
      {
        id: "estimates-completed",
        label: "Completed",
        href: "/estimates?status=COMPLETED",
      },
    ],
  },
  {
    id: "portfolio",
    label: "Portfolio",
    href: "/portfolio",
    roles: PORTFOLIO_ROLES,
    children: [
      {
        id: "portfolio-rollup",
        label: "Roll-up & CR register",
        href: "/portfolio",
        roles: PORTFOLIO_ROLES,
      },
      {
        id: "portfolio-budget",
        label: "Budget",
        href: "/portfolio#budget",
        roles: PORTFOLIO_ROLES,
      },
    ],
  },
  {
    id: "scenarios",
    label: "Scenarios",
    roles: SCENARIO_ROLES,
    children: [
      {
        id: "what-if",
        label: "What-If",
        href: "/what-if",
        roles: SCENARIO_ROLES,
      },
    ],
  },
  {
    id: "learning",
    label: "Learning",
    roles: LEARNING_ROLES,
    children: [
      {
        id: "calibration",
        label: "Calibration",
        href: "/calibration",
        roles: LEARNING_ROLES,
      },
      {
        id: "analytics",
        label: "Analytics",
        href: "/analytics",
        roles: LEARNING_ROLES,
      },
    ],
  },
  {
    id: "administration",
    label: "Administration",
    href: "/admin",
    roles: ADMIN_ROLES,
    children: [
      { id: "admin-overview", label: "Overview", href: "/admin", roles: ADMIN_ROLES },
      {
        id: "admin-access",
        label: "Access",
        roles: USER_ADMIN_ROLES,
        children: [
          {
            id: "admin-users",
            label: "Login credentials",
            href: "/admin/users",
            createHref: "/admin/users",
            createLabel: "Create login",
            createRoles: USER_ADMIN_ROLES,
            roles: USER_ADMIN_ROLES,
          },
        ],
      },
      {
        id: "admin-org",
        label: "Organisation",
        roles: ADMIN_ROLES,
        children: [
          {
            id: "teams",
            label: "Teams",
            href: "/teams",
            createHref: "/teams/new",
            createLabel: "Create new team",
            createRoles: ["ADMINISTRATOR"],
            roles: ADMIN_ROLES,
          },
          {
            id: "team-composition",
            label: "Team composition",
            href: "/admin/team-composition",
            roles: ADMIN_ROLES,
          },
        ],
      },
      {
        id: "admin-size",
        label: "Size & complexity",
        roles: ADMIN_ROLES,
        children: [
          { id: "issue-mapping", label: "Issue mapping", href: "/admin/issue-mapping", roles: ADMIN_ROLES },
          { id: "epic-mapping", label: "Epic mapping", href: "/admin/epic-mapping", roles: ADMIN_ROLES },
          {
            id: "complexity-mapping",
            label: "Complexity mapping",
            href: "/admin/complexity-mapping",
            roles: ADMIN_ROLES,
          },
        ],
      },
      {
        id: "admin-people",
        label: "People & capacity",
        roles: ADMIN_ROLES,
        children: [
          {
            id: "resource-mapping",
            label: "Resource mapping",
            href: "/admin/resource-mapping",
            roles: ADMIN_ROLES,
          },
        ],
      },
      {
        id: "admin-commercial",
        label: "Commercial",
        roles: ADMIN_ROLES,
        children: [
          {
            id: "cost-mapping",
            label: "Location sprint rates",
            href: "/admin/cost-mapping",
            roles: ADMIN_ROLES,
          },
          {
            id: "team-cost-mapping",
            label: "Team sprint rates",
            href: "/admin/team-cost-mapping",
            roles: ADMIN_ROLES,
          },
          {
            id: "daily-rates",
            label: "Location daily rates",
            href: "/admin/daily-rates",
            roles: ADMIN_ROLES,
          },
        ],
      },
      {
        id: "admin-engine",
        label: "Engine",
        roles: ADMIN_ROLES,
        children: [
          {
            id: "estimation-config",
            label: "Estimation config",
            href: "/admin/estimation-config",
            roles: ADMIN_ROLES,
          },
        ],
      },
    ],
  },
];

export function canSeeNav(node: NavNode, role: string): boolean {
  if (role === "ADMINISTRATOR") return true;
  if (!node.roles || node.roles.length === 0) return true;
  return node.roles.includes(role);
}

export function canCreate(node: NavNode, role: string): boolean {
  if (!node.createHref) return false;
  if (!node.createRoles || node.createRoles.length === 0) return true;
  return role === "ADMINISTRATOR" || node.createRoles.includes(role);
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
