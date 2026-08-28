# DEC-008 Lifecycle eligibility semantics (cancellation / descoping / re-baselining)

**Status: DRAFT — scope only, not yet decided or implemented.** Opened by DEC-007 A3 (Option 3
split). This record scopes the lifecycle states that calibration eligibility needs but the current
data model does not represent. Nothing here is built until this record is accepted.

## Why this exists

DEC-007 A3 defines the *target* eligible-CR predicate as: COMPLETED + finalised actuals, **and
not** cancelled / descoped / re-baselined-after-estimation, with estimated effort ≥ `min_size_pd`.
The representable parts (COMPLETED + actuals present + size floor + outlier clamping) are enforced
in A3. The three lifecycle exclusions are **not** — those states are absent from the model, and
governance forbids proxying them. This record is where they get designed.

Verified current state (as of DEC-007 A3):
- Estimate statuses are exactly `DRAFT, RETURNED, READY_FOR_REVIEW, REVIEWED, APPROVED, REJECTED,
  COMPLETED` (state machine in `estimateService.ts`: submit → review → approve/reject/return).
- No `CANCELLED` status, no descoped flag, no archived/soft-delete field.
- `EstimateVersion` is a generic per-recompute snapshot log — **not** a baseline/re-baseline
  semantic. Using it to infer "re-baselined" would be proxy logic and is out of scope.
- "Finalised" actuals = status COMPLETED + an `ActualDelivery` row; actuals are **mutable** via
  upsert (no lock).

## Questions to decide (not yet answered)

1. **Cancellation** — how is a CR cancelled? A new terminal status (`CANCELLED`), a flag, or a
   soft-delete? What transitions are legal into it, and from which prior statuses?
2. **Descoping** — is "descoped" a whole-CR state, or partial (some scope removed while the CR
   proceeds)? If partial, does calibration need the descoped magnitude, not just a boolean?
3. **Baseline commitment** — when is an estimate's **baseline** committed (the estimated effort
   against which actuals are later compared)? At approval? At a explicit "commit baseline" action?
   This is the anchor the whole calibration comparison depends on.
4. **Re-baselining after estimation** — how is a legitimate re-baseline recorded and distinguished
   from an ordinary recompute? Does re-baselining supersede the prior baseline for calibration, or
   invalidate the CR for calibration entirely?
5. **Representation** — concrete schema: statuses, flags, and/or a baseline/version model; and how
   each state is queried for eligibility.
6. **Authorisation** — who may perform each transition (cancel, descope, commit/​re-baseline), and
   under what RBAC feature grant.
7. **Audit** — which `AuditEvent`s each transition must emit (actor, timestamp, before/after).
8. **Historical eligibility change** — when a transition occurs on a CR that was **already
   included** in a past calibration, how does calibration eligibility change retroactively? Does a
   previously-applied calibration get flagged for review? Is recalculation triggered, or only
   future calibrations affected? (Governance-sensitive: past applied parameters are versioned.)

## Impact on DEC-007

Once accepted and implemented, the A3 eligibility predicate in DEC-007 extends to exclude the
cancelled / descoped / re-baselined states. Until then, DEC-007 A3 runs the representable subset
and a CR in one of those real-world states (still COMPLETED + actuals) is included.

## Out of scope

Implementation. This record only defines the problem and the decisions required. A separate
accepted version + tasks will cover the schema, workflow, RBAC, audit, and calibration changes.
