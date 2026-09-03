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

/**
 * Display labels for estimate statuses. The `REVIEWED` enum value is the "passed review, awaiting
 * approval" stage — surfaced to users as "Awaiting approval". The enum value is unchanged (data,
 * filters, analytics, two-person rule all stay intact); only the label differs.
 */
export const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  RETURNED: "Returned",
  READY_FOR_REVIEW: "Ready for review",
  REVIEWED: "Awaiting approval",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status.replaceAll("_", " ");
}

export function canTransition(action: TransitionAction, from: string): boolean {
  return STATUS_TRANSITIONS[action].from.includes(from);
}

/**
 * DEC-008 D5: calibration eligibility is DERIVED from governed facts (single source of truth,
 * no drift-prone flag). Lifecycle gate (combined with the DEC-007 A3/A4 predicate elsewhere):
 *   eligible ⟺ status = COMPLETED
 *            AND descoped = false                       (L2/D2)
 *            AND not re-baselined after commit          (L4/D4: exactly one committed baseline)
 * `baselineVersions` is optional until the baseline model exists (L3/L4); when absent the
 * re-baseline clause is not yet enforced.
 */
export function isCalibrationLifecycleEligible(cr: {
  status: string;
  descoped?: boolean;
  baselineVersions?: number;
}): boolean {
  if (cr.status !== "COMPLETED") return false;
  if (cr.descoped) return false;
  if (cr.baselineVersions != null && cr.baselineVersions !== 1) return false;
  return true;
}
