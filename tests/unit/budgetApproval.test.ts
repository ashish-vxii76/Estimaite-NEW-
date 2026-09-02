import { describe, expect, it } from "vitest";
import { decideBudgetApprover } from "@/services/orgService";

// Governance: a crew-budget change is approved by an App admin, a higher-tier budget admin (anchored
// ABOVE the crew), or the crew's own Crew Tech Lead / deputy. A plain crew-level admin submits only.
const base = {
  hasBudgetRW: true,
  appLevel: false,
  anchorId: "crew" as string | null,
  crewId: "crew",
  crewInScope: true,
  hasCtlSeat: false,
  hasDeputyGrant: false,
};

describe("crew-budget approver rule (DEC-016)", () => {
  it("requires the budget grant at all", () => {
    expect(decideBudgetApprover({ ...base, hasBudgetRW: false, appLevel: true })).toBe(false);
  });

  it("App admin approves anything", () => {
    expect(decideBudgetApprover({ ...base, appLevel: true, crewInScope: false })).toBe(true);
  });

  it("a plain crew admin (anchored AT the crew, no CTL seat/deputy) cannot approve — submit only", () => {
    expect(decideBudgetApprover({ ...base })).toBe(false);
  });

  it("the crew's Tech Lead or deputy can approve", () => {
    expect(decideBudgetApprover({ ...base, hasCtlSeat: true })).toBe(true);
    expect(decideBudgetApprover({ ...base, hasDeputyGrant: true })).toBe(true);
  });

  it("a higher-tier budget admin anchored above the crew can approve", () => {
    expect(decideBudgetApprover({ ...base, anchorId: "stream" })).toBe(true);
  });

  it("cannot approve a crew outside the actor's scope", () => {
    expect(decideBudgetApprover({ ...base, anchorId: "otherStream", crewInScope: false })).toBe(false);
  });
});
