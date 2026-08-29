// Governed estimate lifecycle transitions — pure, no I/O, so the state machine is unit-testable.
// The service (estimateService.transitionStatus) enforces these plus segregation-of-duties,
// mandatory reasons, atomicity and audit. DEC-008 L1 added `cancel`.

export type TransitionAction = "submit" | "review" | "approve" | "reject" | "return" | "cancel";

export const STATUS_TRANSITIONS: Record<TransitionAction, { from: string[]; to: string }> = {
  submit: { from: ["DRAFT", "RETURNED"], to: "READY_FOR_REVIEW" },
  review: { from: ["READY_FOR_REVIEW"], to: "REVIEWED" },
  approve: { from: ["REVIEWED", "READY_FOR_REVIEW"], to: "APPROVED" },
  reject: { from: ["READY_FOR_REVIEW", "REVIEWED"], to: "REJECTED" },
  return: { from: ["READY_FOR_REVIEW", "REVIEWED"], to: "RETURNED" },
  // DEC-008 L1: cancel from in-flight states only. CANCELLED is terminal (in no `from` list), so
  // COMPLETED, REJECTED and CANCELLED can never transition to it (or anywhere).
  cancel: {
    from: ["DRAFT", "RETURNED", "READY_FOR_REVIEW", "REVIEWED", "APPROVED"],
    to: "CANCELLED",
  },
};

/** Actions that require a mandatory reason/comment. */
export const REASON_REQUIRED: ReadonlySet<TransitionAction> = new Set(["cancel"]);

export function canTransition(action: TransitionAction, from: string): boolean {
  return STATUS_TRANSITIONS[action].from.includes(from);
}
