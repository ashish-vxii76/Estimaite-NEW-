import { describe, expect, it } from "vitest";
import { can, canAccessPath, seesAllTeams, writesOwnRecordsOnly } from "@/lib/rbac";
import { estimateScope, canSeeEstimate } from "@/lib/scope";

describe("RBAC matrix", () => {
  it("gives Admin every team and Approver only team-scoped records", () => {
    expect(seesAllTeams("ADMINISTRATOR")).toBe(true);
    expect(seesAllTeams("APPROVER")).toBe(false);
    expect(estimateScope({ id: "a", role: "ADMINISTRATOR", teamId: null })).toEqual({});
    expect(estimateScope({ id: "b", role: "APPROVER", teamId: "vikings" })).toEqual({
      teamId: "vikings",
    });
    expect(canSeeEstimate({ id: "b", role: "APPROVER", teamId: "vikings" }, { teamId: "spartans" })).toBe(
      false,
    );
    expect(canSeeEstimate({ id: "a", role: "ADMINISTRATOR", teamId: null }, { teamId: "spartans" })).toBe(
      true,
    );
  });

  it("keeps review and approve segregated", () => {
    expect(can("REVIEWER", "estimates.review", "RW")).toBe(true);
    expect(can("REVIEWER", "estimates.approve", "RW")).toBe(false);
    expect(can("APPROVER", "estimates.approve", "RW")).toBe(true);
    expect(can("APPROVER", "estimates.review", "RW")).toBe(false);
    expect(can("APPROVER", "estimates.create", "RW")).toBe(false);
  });

  it("hides portfolio from Requester and login credentials from Finance", () => {
    expect(canAccessPath("REQUESTER", "/portfolio")).toBe(false);
    expect(canAccessPath("APPROVER", "/portfolio")).toBe(true);
    expect(canAccessPath("APPROVER", "/estimates/new")).toBe(false);
    expect(canAccessPath("FINANCE", "/admin")).toBe(true);
    expect(canAccessPath("FINANCE", "/admin/users")).toBe(false);
    expect(canAccessPath("ADMINISTRATOR", "/admin/rbac")).toBe(true);
    expect(canAccessPath("APPROVER", "/admin/rbac")).toBe(false);
    expect(canAccessPath("APPROVER", "/admin/issue-mapping")).toBe(true);
  });

  it("limits write-own roles", () => {
    expect(writesOwnRecordsOnly("REQUESTER")).toBe(true);
    expect(writesOwnRecordsOnly("APPROVER")).toBe(false);
    expect(writesOwnRecordsOnly("ADMINISTRATOR")).toBe(false);
  });
});
