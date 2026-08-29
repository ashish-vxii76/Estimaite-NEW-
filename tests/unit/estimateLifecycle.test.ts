import { describe, it, expect } from "vitest";
import {
  STATUS_TRANSITIONS,
  REASON_REQUIRED,
  canTransition,
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
