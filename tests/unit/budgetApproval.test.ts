import { describe, expect, it } from "vitest";
import { decideBudgetApprover } from "@/services/orgService";

// Governance: a crew-budget change is approved by an App admin, a higher-tier budget admin (anchored
// ABOVE the crew), or a crew-approver seat AT the crew — Crew Admin, CTL, CPL, Deputy CTL/CPL or the
// Crew Delivery Lead. Maker ≠ Checker is enforced separately at approval time (requester ≠ approver).
const base = {
  hasBudgetRW: true,
  appLevel: false,
  anchorId: "crew" as string | null,
  crewId: "crew",
  crewInScope: true,
  hasCrewApproverSeat: false,
};

describe("crew-budget approver rule", () => {
  it("requires the budget grant at all", () => {
    expect(decideBudgetApprover({ ...base, hasBudgetRW: false, appLevel: true })).toBe(false);
  });

  it("App admin approves anything", () => {
    expect(decideBudgetApprover({ ...base, appLevel: true, crewInScope: false })).toBe(true);
  });

  it("a crew-anchored actor with no approver seat cannot approve — submit only", () => {
    expect(decideBudgetApprover({ ...base })).toBe(false);
  });

  it("a crew-approver seat (Crew Admin / CTL / CPL / deputy / Crew DL) at the crew can approve", () => {
    expect(decideBudgetApprover({ ...base, hasCrewApproverSeat: true })).toBe(true);
  });

  it("a higher-tier budget admin anchored above the crew can approve", () => {
    expect(decideBudgetApprover({ ...base, anchorId: "stream" })).toBe(true);
  });

  it("cannot approve a crew outside the actor's scope", () => {
    expect(decideBudgetApprover({ ...base, anchorId: "otherStream", crewInScope: false })).toBe(false);
  });
});
