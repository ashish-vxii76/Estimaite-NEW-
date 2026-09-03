import { describe, it, expect } from "vitest";
import { resolveEstimateScope } from "@/lib/scope";
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
