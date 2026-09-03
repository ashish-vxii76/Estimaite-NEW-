import { describe, it, expect } from "vitest";
import { resolveEstimateScope, canSeeEstimateAsync, ROLE_STATUS_SCOPE } from "@/lib/scope";
import { statusLabel } from "@/lib/estimateLifecycle";

describe("record scope", () => {
  it("scopes an Estimator to their own authored estimates (owner scope)", async () => {
    const where = await resolveEstimateScope({ id: "u1", role: "ESTIMATOR", teamId: "t1" });
    expect(where).toEqual({ createdById: "u1" });
  });

  it("gives the unscoped Application Admin every record", async () => {
    // ADMINISTRATOR with no seat/grant anchor = app-level.
    const where = await resolveEstimateScope({ id: "admin", role: "ADMINISTRATOR", teamId: null });
    expect(where).toEqual({});
  });

  it("queue-scopes workflow roles to their statuses", () => {
    expect(ROLE_STATUS_SCOPE.APPROVER).toEqual(["REVIEWED", "APPROVED"]);
    expect(ROLE_STATUS_SCOPE.REVIEWER).toEqual(["READY_FOR_REVIEW"]);
    // Leadership / admin are NOT queue-scoped (full-stage oversight).
    expect(ROLE_STATUS_SCOPE.DELIVERY_LEAD).toBeUndefined();
    expect(ROLE_STATUS_SCOPE.ADMINISTRATOR).toBeUndefined();
  });

  it("an Approver cannot see estimates outside their queue (Draft / Ready-for-review)", async () => {
    const u = { id: "ap", role: "APPROVER", teamId: "t1" };
    expect(await canSeeEstimateAsync(u, { teamId: "t1", status: "DRAFT" })).toBe(false);
    expect(await canSeeEstimateAsync(u, { teamId: "t1", status: "READY_FOR_REVIEW" })).toBe(false);
  });

  it("a Reviewer cannot see an Approved estimate", async () => {
    const u = { id: "rv", role: "REVIEWER", teamId: "t1" };
    expect(await canSeeEstimateAsync(u, { teamId: "t1", status: "APPROVED" })).toBe(false);
  });

  it("an Estimator cannot see an estimate they did not author", async () => {
    const u = { id: "es", role: "ESTIMATOR", teamId: "t1" };
    expect(await canSeeEstimateAsync(u, { teamId: "t1", status: "DRAFT", createdById: "someone-else" })).toBe(false);
    expect(await canSeeEstimateAsync(u, { teamId: "t1", status: "DRAFT", createdById: "es" })).toBe(true);
  });
});

describe("status labels", () => {
  it("relabels REVIEWED as 'Awaiting approval' while keeping the enum value", () => {
    expect(statusLabel("REVIEWED")).toBe("Awaiting approval");
    expect(statusLabel("READY_FOR_REVIEW")).toBe("Ready for review");
    expect(statusLabel("APPROVED")).toBe("Approved");
    // Non-status flags (delivery decisions) fall back to a humanised value.
    expect(statusLabel("SPLIT EPIC")).toBe("SPLIT EPIC");
  });
});
