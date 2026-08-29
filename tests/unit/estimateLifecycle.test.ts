import { describe, it, expect } from "vitest";
import {
  STATUS_TRANSITIONS,
  REASON_REQUIRED,
  canTransition,
  isCalibrationLifecycleEligible,
  type TransitionAction,
} from "@/lib/estimateLifecycle";

describe("estimate lifecycle — cancel transition (DEC-008 L1)", () => {
  const ALLOWED_FROM = ["DRAFT", "RETURNED", "READY_FOR_REVIEW", "REVIEWED", "APPROVED"];
  const PROHIBITED_FROM = ["COMPLETED", "REJECTED", "CANCELLED"];

  it("targets the CANCELLED terminal status", () => {
    expect(STATUS_TRANSITIONS.cancel.to).toBe("CANCELLED");
  });

  it.each(ALLOWED_FROM)("allows %s → CANCELLED", (from) => {
    expect(canTransition("cancel", from)).toBe(true);
  });

  it.each(PROHIBITED_FROM)("prohibits %s → CANCELLED", (from) => {
    expect(canTransition("cancel", from)).toBe(false);
  });

  it("CANCELLED is terminal — no action transitions out of it", () => {
    const actions: TransitionAction[] = ["submit", "review", "approve", "reject", "return", "cancel"];
    for (const action of actions) {
      expect(canTransition(action, "CANCELLED")).toBe(false);
    }
  });

  it("cancel requires a mandatory reason; ordinary transitions do not", () => {
    expect(REASON_REQUIRED.has("cancel")).toBe(true);
    for (const action of ["submit", "review", "approve", "reject", "return"] as TransitionAction[]) {
      expect(REASON_REQUIRED.has(action)).toBe(false);
    }
  });

  it("does not regress the existing transitions", () => {
    expect(canTransition("submit", "DRAFT")).toBe(true);
    expect(canTransition("submit", "RETURNED")).toBe(true);
    expect(canTransition("approve", "REVIEWED")).toBe(true);
    expect(canTransition("reject", "READY_FOR_REVIEW")).toBe(true);
    expect(canTransition("review", "APPROVED")).toBe(false);
    expect(canTransition("submit", "COMPLETED")).toBe(false);
  });
});

describe("calibration lifecycle eligibility (DEC-008 D5: derived)", () => {
  it("eligible: COMPLETED, not descoped", () => {
    expect(isCalibrationLifecycleEligible({ status: "COMPLETED", descoped: false })).toBe(true);
    expect(isCalibrationLifecycleEligible({ status: "COMPLETED" })).toBe(true);
  });

  it("ineligible: descoped (L2/D2)", () => {
    expect(isCalibrationLifecycleEligible({ status: "COMPLETED", descoped: true })).toBe(false);
  });

  it("ineligible: not COMPLETED (cancelled, approved, etc.)", () => {
    for (const status of ["DRAFT", "APPROVED", "REJECTED", "CANCELLED"]) {
      expect(isCalibrationLifecycleEligible({ status })).toBe(false);
    }
  });

  it("re-baseline clause (L4): exactly one committed baseline is eligible; >1 is not", () => {
    expect(isCalibrationLifecycleEligible({ status: "COMPLETED", baselineVersions: 1 })).toBe(true);
    expect(isCalibrationLifecycleEligible({ status: "COMPLETED", baselineVersions: 2 })).toBe(false);
    // absent (pre-L3/L4) → clause not yet enforced
    expect(isCalibrationLifecycleEligible({ status: "COMPLETED" })).toBe(true);
  });
});
