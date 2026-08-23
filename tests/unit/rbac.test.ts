import { describe, expect, it } from "vitest";
import {
  FEATURES,
  RBAC,
  ROLES,
  accessFor,
  can,
  canAccessPath,
  normalizeMatrix,
  seesAllTeams,
  writesOwnRecordsOnly,
  type Access,
  type AppRole,
  type FeatureId,
} from "@/lib/rbac";
import { estimateScope, canSeeEstimate } from "@/lib/scope";

/** PDF matrix: trailing blanks omitted in the source table. */
const PDF: Record<FeatureId, Partial<Record<AppRole, Access>>> = {
  home: {
    ADMINISTRATOR: "R",
    REQUESTER: "R",
    ESTIMATOR: "R",
    REVIEWER: "R",
    APPROVER: "R",
    DELIVERY_LEAD: "R",
    FINANCE: "R",
    VIEWER: "R",
  },
  "home.notifications": {
    ADMINISTRATOR: "R",
    REQUESTER: "R",
    ESTIMATOR: "R",
    REVIEWER: "R",
    APPROVER: "R",
    DELIVERY_LEAD: "R",
    FINANCE: "R",
    VIEWER: "R",
  },
  "home.actions": {
    ADMINISTRATOR: "R",
    REQUESTER: "R",
    ESTIMATOR: "R",
    REVIEWER: "R",
    APPROVER: "R",
    DELIVERY_LEAD: "R",
    FINANCE: "R",
  },
  "estimates.list": {
    ADMINISTRATOR: "R",
    REQUESTER: "R",
    ESTIMATOR: "R",
    REVIEWER: "R",
    APPROVER: "R",
    DELIVERY_LEAD: "R",
    FINANCE: "R",
    VIEWER: "R",
  },
  "estimates.create": {
    ADMINISTRATOR: "RW",
    REQUESTER: "RW",
    ESTIMATOR: "RW",
    DELIVERY_LEAD: "RW",
  },
  "estimates.edit": {
    ADMINISTRATOR: "RW",
    REQUESTER: "RW",
    ESTIMATOR: "RW",
    DELIVERY_LEAD: "RW",
  },
  "estimates.submit": {
    ADMINISTRATOR: "RW",
    REQUESTER: "RW",
    ESTIMATOR: "RW",
    DELIVERY_LEAD: "RW",
  },
  "estimates.actuals": {
    ADMINISTRATOR: "RW",
    ESTIMATOR: "RW",
    DELIVERY_LEAD: "RW",
  },
  "estimates.review": { ADMINISTRATOR: "RW", REVIEWER: "RW" },
  "estimates.approve": { ADMINISTRATOR: "RW", APPROVER: "RW" },
  "estimates.reopen": { ADMINISTRATOR: "RW", APPROVER: "RW" },
  "estimates.archive": { ADMINISTRATOR: "RW", ESTIMATOR: "RW", DELIVERY_LEAD: "RW" },
  "estimates.delete": { ADMINISTRATOR: "RW" },
  "estimates.export": { ADMINISTRATOR: "RW", DELIVERY_LEAD: "RW", FINANCE: "RW" },
  "portfolio.view": {
    ADMINISTRATOR: "R",
    ESTIMATOR: "R",
    REVIEWER: "R",
    APPROVER: "R",
    DELIVERY_LEAD: "R",
    FINANCE: "R",
    VIEWER: "R",
  },
  "portfolio.budget": { ADMINISTRATOR: "RW", FINANCE: "RW" },
  whatIf: {
    ADMINISTRATOR: "RW",
    ESTIMATOR: "RW",
    REVIEWER: "RW",
    APPROVER: "RW",
    DELIVERY_LEAD: "RW",
  },
  "calibration.view": {
    ADMINISTRATOR: "R",
    ESTIMATOR: "R",
    REVIEWER: "R",
    APPROVER: "R",
    DELIVERY_LEAD: "R",
    FINANCE: "R",
  },
  "calibration.apply": { ADMINISTRATOR: "RW" },
  analytics: {
    ADMINISTRATOR: "R",
    ESTIMATOR: "R",
    REVIEWER: "R",
    APPROVER: "R",
    DELIVERY_LEAD: "R",
    FINANCE: "R",
    VIEWER: "R",
  },
  "config.teams": { ADMINISTRATOR: "RW", FINANCE: "R" },
  "config.rates": { ADMINISTRATOR: "RW", DELIVERY_LEAD: "R", FINANCE: "R" },
  "config.mappings": {
    ADMINISTRATOR: "RW",
    ESTIMATOR: "R",
    REVIEWER: "R",
    APPROVER: "R",
    DELIVERY_LEAD: "R",
  },
  "config.users": { ADMINISTRATOR: "RW" },
  "config.rbac": { ADMINISTRATOR: "RW" },
  "org.setup": { ADMINISTRATOR: "RW", DELIVERY_LEAD: "R" },
  "org.budget": { ADMINISTRATOR: "RW", FINANCE: "RW", DELIVERY_LEAD: "RW" },
  "scope.allTeams": { ADMINISTRATOR: "R" },
  "scope.writeAnyOnTeam": {
    ADMINISTRATOR: "R",
    REVIEWER: "R",
    APPROVER: "R",
    FINANCE: "R",
    VIEWER: "R",
  },
};

describe("RBAC matrix", () => {
  it("matches the PDF cell-for-cell (blank = deny)", () => {
    for (const feature of FEATURES) {
      for (const role of ROLES) {
        expect(accessFor(role, feature.id), `${role} × ${feature.id}`).toBe(PDF[feature.id][role] ?? null);
        expect(RBAC[feature.id][role]).toBe(PDF[feature.id][role] ?? null);
      }
    }
  });

  it("treats R as view-only and RW as the only write grant", () => {
    expect(can("APPROVER", "config.mappings", "R")).toBe(true);
    expect(can("APPROVER", "config.mappings", "RW")).toBe(false);
    expect(can("FINANCE", "config.teams", "R")).toBe(true);
    expect(can("FINANCE", "config.teams", "RW")).toBe(false);
    expect(can("FINANCE", "portfolio.budget", "RW")).toBe(true);
    expect(can("DELIVERY_LEAD", "config.rates", "R")).toBe(true);
    expect(can("DELIVERY_LEAD", "config.rates", "RW")).toBe(false);
    expect(can("REQUESTER", "portfolio.view")).toBe(false);
    expect(can("VIEWER", "whatIf")).toBe(false);
    expect(can("REVIEWER", "estimates.create", "RW")).toBe(false);
  });

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
    expect(writesOwnRecordsOnly("ESTIMATOR")).toBe(true);
    expect(writesOwnRecordsOnly("DELIVERY_LEAD")).toBe(true);
    expect(writesOwnRecordsOnly("APPROVER")).toBe(false);
    expect(writesOwnRecordsOnly("ADMINISTRATOR")).toBe(false);
  });

  it("derives team and write scope from matrix cells, not role names", () => {
    const custom = normalizeMatrix({
      ...RBAC,
      "scope.allTeams": { ...RBAC["scope.allTeams"], APPROVER: "R" },
      "scope.writeAnyOnTeam": { ...RBAC["scope.writeAnyOnTeam"], ESTIMATOR: "R" },
    });
    expect(seesAllTeams("APPROVER", custom)).toBe(true);
    expect(seesAllTeams("APPROVER")).toBe(false);
    expect(writesOwnRecordsOnly("ESTIMATOR", custom)).toBe(false);
    expect(writesOwnRecordsOnly("ESTIMATOR")).toBe(true);
  });

  it("applies a saved overlay so Requester can be granted portfolio", () => {
    const custom = normalizeMatrix({
      ...RBAC,
      "portfolio.view": { ...RBAC["portfolio.view"], REQUESTER: "R" },
    });
    expect(can("REQUESTER", "portfolio.view", "R", custom)).toBe(true);
    expect(can("REQUESTER", "portfolio.view", "RW", custom)).toBe(false);
    expect(canAccessPath("REQUESTER", "/portfolio", custom)).toBe(true);
  });
});
