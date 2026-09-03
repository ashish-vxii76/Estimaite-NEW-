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
  "estimates.review": { ADMINISTRATOR: "RW", REVIEWER: "RW", DELIVERY_LEAD: "RW" },
  "estimates.approve": { ADMINISTRATOR: "RW", APPROVER: "RW", DELIVERY_LEAD: "RW" },
  "estimates.reopen": { ADMINISTRATOR: "RW", APPROVER: "RW", DELIVERY_LEAD: "RW" },
  "estimates.cancel": { ADMINISTRATOR: "RW", DELIVERY_LEAD: "RW" }, // DEC-008 D6
  "estimates.descope": { ADMINISTRATOR: "RW", DELIVERY_LEAD: "RW" }, // DEC-008 D6
  "estimates.rebaseline": { ADMINISTRATOR: "RW" }, // DEC-008 D6 (strongest governance)
  "estimates.archive": { ADMINISTRATOR: "RW", ESTIMATOR: "RW", DELIVERY_LEAD: "RW" },
  "estimates.delete": { ADMINISTRATOR: "RW" },
  "estimates.export": { ADMINISTRATOR: "RW", DELIVERY_LEAD: "RW", FINANCE: "RW" },
  "portfolio.view": {
    ADMINISTRATOR: "R",
    DELIVERY_LEAD: "R",
    FINANCE: "R",
  },
  "portfolio.budget": { ADMINISTRATOR: "RW", DELIVERY_LEAD: "RW" },
  whatIf: {
    ADMINISTRATOR: "RW",
    ESTIMATOR: "RW",
    REVIEWER: "RW",
    APPROVER: "RW",
    DELIVERY_LEAD: "RW",
  },
  "calibration.view": {
    ADMINISTRATOR: "R",
    DELIVERY_LEAD: "R",
  },
  "calibration.apply": { ADMINISTRATOR: "RW" },
  analytics: {
    ADMINISTRATOR: "R",
    DELIVERY_LEAD: "R",
    FINANCE: "R",
  },
  "config.teams": { ADMINISTRATOR: "RW" },
  "config.rates": { ADMINISTRATOR: "RW", FINANCE: "RW" },
  "config.mappings": { ADMINISTRATOR: "RW" },
  "config.crewLevels": { ADMINISTRATOR: "RW" },
  "config.crewMappings": { ADMINISTRATOR: "RW" },
  // Additive feature: tamper-evident audit-trail export (was a hardcoded ADMINISTRATOR check).
  "audit.export": { ADMINISTRATOR: "RW" },
  "config.users": { ADMINISTRATOR: "RW" },
  "config.rbac": { ADMINISTRATOR: "RW" },
  "org.setup": { ADMINISTRATOR: "RW" },
  "org.budget": { ADMINISTRATOR: "RW", DELIVERY_LEAD: "RW" },
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

  it("reflects the redesigned model — no config leaks to workflow/leadership roles", () => {
    expect(can("ADMINISTRATOR", "config.mappings", "RW")).toBe(true);
    // Config reads no longer leak to workflow roles.
    expect(can("APPROVER", "config.mappings", "R")).toBe(false);
    expect(can("ESTIMATOR", "config.mappings", "R")).toBe(false);
    // Finance = global commercial admin (rates RW), nothing else in config.
    expect(can("FINANCE", "config.rates", "RW")).toBe(true);
    expect(can("FINANCE", "config.teams", "R")).toBe(false);
    // Leadership (Delivery Lead) has no config-admin, but holds crew budgets.
    expect(can("DELIVERY_LEAD", "config.rates", "R")).toBe(false);
    expect(can("DELIVERY_LEAD", "org.budget", "RW")).toBe(true);
    // Viewer/Estimator/Requester lose portfolio + calibration.
    expect(can("VIEWER", "portfolio.view")).toBe(false);
    expect(can("ESTIMATOR", "calibration.view")).toBe(false);
    expect(can("REQUESTER", "portfolio.view")).toBe(false);
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

  it("gates roll-up to leadership/finance/admin and config to admins", () => {
    // Roll-up: leadership + finance + admin only.
    expect(canAccessPath("REQUESTER", "/portfolio")).toBe(false);
    expect(canAccessPath("APPROVER", "/portfolio")).toBe(false);
    expect(canAccessPath("DELIVERY_LEAD", "/portfolio")).toBe(true);
    expect(canAccessPath("FINANCE", "/portfolio")).toBe(true);
    expect(canAccessPath("APPROVER", "/estimates/new")).toBe(false);
    // Finance sees only the commercial (rates) slice of Administration.
    expect(canAccessPath("FINANCE", "/admin")).toBe(true);
    expect(canAccessPath("FINANCE", "/admin/cost-mapping")).toBe(true);
    expect(canAccessPath("FINANCE", "/admin/users")).toBe(false);
    expect(canAccessPath("ADMINISTRATOR", "/admin/rbac")).toBe(true);
    expect(canAccessPath("APPROVER", "/admin/rbac")).toBe(false);
    // Config reads removed from workflow roles.
    expect(canAccessPath("APPROVER", "/admin/issue-mapping")).toBe(false);
    // Delivery Lead reaches crew budgets (leadership surface) but not config admin.
    expect(canAccessPath("DELIVERY_LEAD", "/admin/crew-budgets")).toBe(true);
    expect(canAccessPath("DELIVERY_LEAD", "/admin/issue-mapping")).toBe(false);
  });

  it("denies unlisted /admin/* paths by default, even for Administrator (a)", () => {
    // A new admin route not yet mapped in PATH_FEATURES must fail safe, not fall back to open.
    expect(canAccessPath("ADMINISTRATOR", "/admin/not-yet-mapped")).toBe(false);
    expect(canAccessPath("REQUESTER", "/admin/not-yet-mapped")).toBe(false);
    // A non-admin unlisted path still falls back to home access (unchanged).
    expect(canAccessPath("VIEWER", "/some-future-page")).toBe(true);
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
