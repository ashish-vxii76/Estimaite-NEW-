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

  it("puts RBAC under Access and hides it from Approver", () => {
    expect(find("admin-rbac")?.href).toBe("/admin/rbac");
    expect(canSeeNav(find("admin-rbac")!, "ADMINISTRATOR")).toBe(true);
    expect(canSeeNav(find("admin-rbac")!, "APPROVER")).toBe(false);
    expect(canSeeNav(find("portfolio-rollup")!, "APPROVER")).toBe(true);
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
