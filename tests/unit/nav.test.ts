import { describe, expect, it } from "vitest";
import {
  NAV_TREE,
  canCreate,
  canSeeNav,
  containsActive,
  isNodeActive,
  type NavNode,
} from "@/components/nav/navConfig";

function find(id: string, nodes: NavNode[] = NAV_TREE): NavNode | undefined {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children) {
      const hit = find(id, node.children);
      if (hit) return hit;
    }
  }
  return undefined;
}

describe("left navigation tree", () => {
  it("makes Home the dashboard route with no nested Dashboard page", () => {
    const home = find("home");
    expect(home?.href).toBe("/home");
    expect(home?.children).toBeUndefined();
    expect(isNodeActive(home!, "/home", "", "")).toBe(true);
    expect(isNodeActive(home!, "/estimates", "", "")).toBe(false);
  });

  it("folds Teams + Composition into Organisation setup under Administration", () => {
    expect(NAV_TREE.some((node) => node.id === "organisation")).toBe(false);
    // Teams and Team composition are no longer separate nav entries — they live in Org Setup.
    expect(find("teams")).toBeUndefined();
    expect(find("team-composition")).toBeUndefined();
    const orgSetup = find("organisation-setup");
    expect(orgSetup?.href).toBe("/admin/organisation");
    expect(containsActive(find("administration")!, "/admin/organisation", "", "")).toBe(true);
  });

  it("puts create-new-estimate on the Estimates category", () => {
    const estimates = find("estimates");
    expect(estimates?.createHref).toBe("/estimates/new");
    expect(estimates?.createLabel).toBe("Create new estimate");
    expect(canCreate(estimates!, "REQUESTER")).toBe(true);
    expect(canCreate(estimates!, "VIEWER")).toBe(false);
  });

  it("hides Administration from requesters and shows it to finance", () => {
    const admin = find("administration")!;
    expect(canSeeNav(admin, "REQUESTER")).toBe(false);
    expect(canSeeNav(admin, "FINANCE")).toBe(true);
    expect(canSeeNav(admin, "ADMINISTRATOR")).toBe(true);
  });

  it("restricts Administration to admin tiers — leadership & workflow roles cannot see it", () => {
    const admin = find("administration")!;
    // Workflow roles hold no config-admin write → not an admin tier.
    expect(canSeeNav(admin, "ESTIMATOR")).toBe(false);
    expect(canSeeNav(admin, "REVIEWER")).toBe(false);
    expect(canSeeNav(admin, "APPROVER")).toBe(false);
    expect(canSeeNav(admin, "VIEWER")).toBe(false);
    // Delivery Lead is crew LEADERSHIP (budget approver), not a config admin → no Administration.
    expect(canSeeNav(admin, "DELIVERY_LEAD")).toBe(false);
    // Finance is the global commercial admin (config.rates RW) → sees Administration (rates slice).
    expect(canSeeNav(admin, "FINANCE")).toBe(true);
    expect(canSeeNav(admin, "ADMINISTRATOR")).toBe(true);
  });

  it("Crew budgets is a top-level lifecycle section (like Estimates), not Analytics/Administration", () => {
    // Promoted to a first-class peer of Estimates with a status-tab subtree, gated to crew leadership.
    const node = NAV_TREE.find((n) => n.id === "crew-budgets");
    expect(node).toBeDefined(); // top-level, not nested under Analytics
    expect(node?.href).toBe("/crew-budgets");
    expect(node?.minLevel).toBe("CREW");
    expect(node?.children?.map((c) => c.href)).toEqual([
      "/crew-budgets?new=1",
      "/crew-budgets",
      "/crew-budgets?status=PENDING",
      "/crew-budgets?status=APPROVED",
    ]);
    expect(canSeeNav(node!, "DELIVERY_LEAD")).toBe(true);
    expect(canSeeNav(node!, "ADMINISTRATOR")).toBe(true);
    expect(canSeeNav(node!, "FINANCE")).toBe(false);
    expect(canSeeNav(node!, "ESTIMATOR")).toBe(false);
    // "All" tab lights up only on bare /crew-budgets, not the status/new variants.
    const all = node!.children!.find((c) => c.id === "crew-budgets-all")!;
    expect(isNodeActive(all, "/crew-budgets", "", "")).toBe(true);
    expect(isNodeActive(all, "/crew-budgets", "?status=PENDING", "")).toBe(false);
    const awaiting = node!.children!.find((c) => c.id === "crew-budgets-awaiting")!;
    expect(isNodeActive(awaiting, "/crew-budgets", "?status=PENDING", "")).toBe(true);
  });

  it("puts RBAC under Access and gates Roll-up to leadership/finance/admin", () => {
    expect(find("admin-rbac")?.href).toBe("/admin/rbac");
    expect(canSeeNav(find("admin-rbac")!, "ADMINISTRATOR")).toBe(true);
    expect(canSeeNav(find("admin-rbac")!, "APPROVER")).toBe(false);
    // Roll-up: leadership, finance, admin only — not the workflow roles.
    expect(canSeeNav(find("portfolio-rollup")!, "DELIVERY_LEAD")).toBe(true);
    expect(canSeeNav(find("portfolio-rollup")!, "FINANCE")).toBe(true);
    expect(canSeeNav(find("portfolio-rollup")!, "APPROVER")).toBe(false);
    expect(canSeeNav(find("portfolio-rollup")!, "REVIEWER")).toBe(false);
    expect(canSeeNav(find("portfolio-rollup")!, "ESTIMATOR")).toBe(false);
    expect(canSeeNav(find("portfolio-rollup")!, "VIEWER")).toBe(false);
    expect(canSeeNav(find("portfolio-rollup")!, "REQUESTER")).toBe(false);
    expect(canSeeNav(find("admin-users")!, "FINANCE")).toBe(false);
    expect(canSeeNav(find("admin-users")!, "ADMINISTRATOR")).toBe(true);
    expect(canCreate(find("estimates")!, "APPROVER")).toBe(false);
  });

  it("treats estimate status filters as distinct from all estimates", () => {
    const all = find("estimates-all")!;
    const drafts = find("estimates-drafts")!;
    expect(isNodeActive(all, "/estimates", "", "")).toBe(true);
    expect(isNodeActive(all, "/estimates", "?status=DRAFT", "")).toBe(false);
    expect(isNodeActive(drafts, "/estimates", "?status=DRAFT", "")).toBe(true);
    expect(isNodeActive(find("new-estimate")!, "/estimates/new", "", "")).toBe(true);
  });
});
