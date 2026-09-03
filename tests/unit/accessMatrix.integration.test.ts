import { describe, expect, it } from "vitest";
import { canAccessPath } from "@/lib/rbac";
import { NAV_TREE, canSeeNav, type NavNode } from "@/components/nav/navConfig";

/**
 * RBAC integration matrix — the safety net for the seat-scoped role redesign.
 * Locks route access (canAccessPath) and left-nav visibility (canSeeNav) for every persona so a
 * future matrix edit that loosens or tightens the wrong cell fails here, not in production.
 *
 * NOTE: this asserts the ROLE/capability layer (matrix). Seat SCOPE (which crew's records/config a
 * user sees) is covered by recordScope + orgAdminScope tests; here every "true" is still scoped to
 * the viewer's seat at runtime.
 */

const ROLES = [
  "ADMINISTRATOR",
  "REQUESTER",
  "ESTIMATOR",
  "REVIEWER",
  "APPROVER",
  "DELIVERY_LEAD",
  "FINANCE",
  "VIEWER",
] as const;

type Role = (typeof ROLES)[number];

// Route × role expectations (canAccessPath). true = reachable, false = redirected.
const ROUTE_ACCESS: Record<string, Partial<Record<Role, boolean>>> = {
  "/home": { ADMINISTRATOR: true, REQUESTER: true, ESTIMATOR: true, REVIEWER: true, APPROVER: true, DELIVERY_LEAD: true, FINANCE: true, VIEWER: true },
  "/estimates": { ADMINISTRATOR: true, REQUESTER: true, ESTIMATOR: true, REVIEWER: true, APPROVER: true, DELIVERY_LEAD: true, VIEWER: true, FINANCE: false },
  "/estimates/new": { ADMINISTRATOR: true, REQUESTER: true, ESTIMATOR: true, DELIVERY_LEAD: true, REVIEWER: false, APPROVER: false, FINANCE: false, VIEWER: false },
  // Roll-up + Calibration: leadership / finance / admin only.
  "/portfolio": { ADMINISTRATOR: true, DELIVERY_LEAD: true, FINANCE: true, ESTIMATOR: false, REVIEWER: false, APPROVER: false, VIEWER: false, REQUESTER: false },
  "/calibration": { ADMINISTRATOR: true, DELIVERY_LEAD: true, FINANCE: false, ESTIMATOR: false, REVIEWER: false, APPROVER: false, VIEWER: false, REQUESTER: false },
  // Crew budgets: crew leadership + admins (NOT finance, NOT workflow roles).
  "/admin/crew-budgets": { ADMINISTRATOR: true, DELIVERY_LEAD: true, FINANCE: false, ESTIMATOR: false, REVIEWER: false, APPROVER: false, VIEWER: false, REQUESTER: false },
  // Config Administration: admins only; Finance sees the commercial (rates) slice, nothing else.
  "/admin": { ADMINISTRATOR: true, FINANCE: true, DELIVERY_LEAD: false, ESTIMATOR: false, REVIEWER: false, APPROVER: false, VIEWER: false, REQUESTER: false },
  "/admin/cost-mapping": { ADMINISTRATOR: true, FINANCE: true, DELIVERY_LEAD: false, APPROVER: false, VIEWER: false },
  "/admin/issue-mapping": { ADMINISTRATOR: true, FINANCE: false, DELIVERY_LEAD: false, APPROVER: false, ESTIMATOR: false },
  "/admin/organisation": { ADMINISTRATOR: true, FINANCE: false, DELIVERY_LEAD: false },
  "/admin/users": { ADMINISTRATOR: true, FINANCE: false, DELIVERY_LEAD: false },
  "/admin/rbac": { ADMINISTRATOR: true, FINANCE: false, APPROVER: false },
};

function findNode(id: string, nodes: NavNode[] = NAV_TREE): NavNode | undefined {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children) {
      const hit = findNode(id, node.children);
      if (hit) return hit;
    }
  }
  return undefined;
}

// Nav node × role expectations (canSeeNav in the left sidebar).
const NAV_VISIBILITY: Record<string, Partial<Record<Role, boolean>>> = {
  administration: { ADMINISTRATOR: true, FINANCE: true, DELIVERY_LEAD: false, ESTIMATOR: false, REVIEWER: false, APPROVER: false, VIEWER: false, REQUESTER: false },
  "portfolio-rollup": { ADMINISTRATOR: true, DELIVERY_LEAD: true, FINANCE: true, ESTIMATOR: false, VIEWER: false, APPROVER: false },
  "crew-budgets": { ADMINISTRATOR: true, DELIVERY_LEAD: true, FINANCE: false, ESTIMATOR: false },
  calibration: { ADMINISTRATOR: true, DELIVERY_LEAD: true, FINANCE: false, VIEWER: false },
};

describe("RBAC access matrix (route × role)", () => {
  for (const [path, expectations] of Object.entries(ROUTE_ACCESS)) {
    for (const [role, expected] of Object.entries(expectations)) {
      it(`${role} ${expected ? "can" : "cannot"} access ${path}`, () => {
        expect(canAccessPath(role, path)).toBe(expected);
      });
    }
  }
});

describe("RBAC nav visibility (node × role)", () => {
  for (const [nodeId, expectations] of Object.entries(NAV_VISIBILITY)) {
    const node = findNode(nodeId);
    it(`nav node "${nodeId}" exists`, () => expect(node).toBeDefined());
    for (const [role, expected] of Object.entries(expectations)) {
      it(`${role} ${expected ? "sees" : "cannot see"} nav "${nodeId}"`, () => {
        expect(canSeeNav(node!, role)).toBe(expected);
      });
    }
  }
});
