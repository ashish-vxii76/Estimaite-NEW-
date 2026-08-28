# DEC-008 Lifecycle eligibility semantics (cancellation / descoping / re-baselining)

**Status: ACCEPTED (decisions) — 2026-08-29. Implementation pending (its own governed increments).**
Opened by DEC-007 A3 (Option 3 split). All eight decision areas (D1–D8) are decided below. No
lifecycle code is written until an implementation plan is approved; **DEC-007 A5 remains blocked
until DEC-008 is implemented** (calibration must be able to exclude cancelled / descoped /
re-baselined CRs before per-crew parameters are operationally applied).

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

## Decisions

### Accepted (2026-08-29)

**D3 — Baseline commitment: at APPROVED, immutable snapshot.**
On approval, create an **immutable baseline snapshot** containing the estimation inputs and
calculated outputs required for actual-vs-estimate comparison. Calibration compares actuals
against **this approved baseline**, never against whatever `resultJson` happens to hold when
actuals are captured. Any legitimate post-approval change must **not** overwrite the original
baseline — it goes through the governed re-baseline process (D4), preserving the original baseline
and its audit history.

**D4 — Re-baselining after estimation: invalidate for calibration, preserve all versions.**
If an approved/committed baseline is subsequently re-baselined, **preserve both the original and
every subsequent baseline version** for audit and analytics, but mark the CR **ineligible for
Days/Point calibration**. Record: original approved baseline; re-baselined version; timestamp;
actor; reason; approval/authorisation; and a governed `calibrationEligible = false` state. Never
delete or overwrite the original baseline. The CR may still be reported in analytics as a
re-baselined delivery, so repeated re-baselining is itself a measurable signal.

**D8 — Historical eligibility change: future-only + flag-for-review (never silent recompute).**
Past applied calibration versions are **immutable** — never silently recomputed, rewritten, or
retracted. If a CR that contributed to a previously applied calibration later becomes ineligible:
exclude it from **all future** calibration computations; preserve the historical applied version
exactly as approved; **flag** that version as "Contains subsequently ineligible evidence"; retain
the original sample set and audit trail; surface the affected CR and the reason; do **not**
auto-change the currently applied Days/Point. An authorised user may initiate a **new** calibration
run if the impact warrants it — any resulting change creates a **new version through the normal
approval process**. Historical versions are never rewritten.

**D1 — Cancellation: new terminal status `CANCELLED`.**
Cancellation is an **explicit governed action**, never inferred. Add `CANCELLED` as an explicit
**terminal** lifecycle status. Record `cancelledAt`, `cancelledBy`, and a **mandatory**
`cancellationReason` in the audit trail. The CR and its complete history are **preserved** —
cancellation is **not** deletion or archive, and CANCELLED CRs remain visible in
historical/reporting/audit views. CANCELLED CRs are **excluded from all future calibration**.
`REJECTED` is **not** mapped to cancellation (different semantics). Cancelling a CR that previously
contributed to an applied calibration follows **D8** (future-only + flag-for-review). The legal
transitions **into** `CANCELLED` must be defined explicitly and validated in the state machine —
**not** allowed blindly from every state (see D5).

**D2 — Descoping: whole-CR calibration ineligibility (governed event/state).**
Descoping is **explicitly recorded**, never inferred. Record `descopedAt`, actor, and a
**mandatory** reason in the audit trail. The CR and its **original approved baseline** are
**preserved and never modified** to compensate for the descoping. A descoped CR is **excluded from
future Days/Point calibration** and (if it previously contributed) follows **D8**. Descoped CRs
remain available for reporting/analysis. **No proportional baseline adjustment** in DEC-008 — but
the representation must be **architected so a future scope-delta model can distinguish partial vs
full descoping** without rework.

**D5 — Representation (schema), synthesised from D1–D4.**
- **Cancellation:** add `CANCELLED` to the Estimate status set (terminal). Legal transitions into
  it — **`DRAFT`, `RETURNED`, `READY_FOR_REVIEW`, `REVIEWED`, `APPROVED` → `CANCELLED`** — added as
  a governed `cancel` transition in the state machine. **Not** from `COMPLETED` (needs a separate
  correction/invalidation mechanism), **not** from `REJECTED` (distinct terminal), and no
  `CANCELLED → CANCELLED` no-op. A `CANCELLED` CR is never auto-reopened; restoration is a separate
  governed decision. Because calibration already requires `status = COMPLETED`, cancelled CRs are
  **excluded automatically**.
- **Descoping:** a governed `descoped` state on the CR (boolean for now), set by an explicit action;
  **architected so a future scope-delta model (partial vs full, magnitude) can be added without
  rework** — but no magnitude-based baseline adjustment in DEC-008.
- **Baseline model:** a dedicated **immutable, versioned baseline** (e.g. `EstimateBaseline`:
  estimateId, version, snapshot of inputs+outputs, committedAt, committedBy, supersededAt, reason).
  Committed at **APPROVED** (v1). Re-baseline appends a new version and marks the CR ineligible;
  **the original and every version are preserved** (never overwritten). `EstimateVersion` (generic
  recompute log) is **not** the baseline.
- **Calibration eligibility is DERIVED** from governed facts (single source of truth, no drift-prone
  flag): eligible ⟺ `status = COMPLETED` **and** `descoped = false` **and** not re-baselined after
  commit (i.e. exactly one committed baseline version) **and** the DEC-007 A3/A4 predicate. Extends
  the DEC-007 A3 predicate.

**D6 — Authorisation: dedicated RBAC grants.**
New RBAC-matrix features **`estimates.cancel`, `estimates.descope`, `estimates.rebaseline`**.
Baseline commitment rides on the existing **`estimates.approve`** (no separate grant). Do **not**
reuse `estimates.approve` / `estimates.reopen` / generic write for cancel/descope/re-baseline. Each
transition independently enforces: the RBAC grant; a valid source lifecycle state; a **mandatory
reason**; actor + timestamp; an immutable audit event; and the relevant before/after state or
baseline references. Grants are configured through the **RBAC matrix** (not hard-coded roles),
default conservative to governance roles. **Re-baseline gets the strongest governance** — where the
approval workflow supports it, require a governed approval, not mere possession of the grant.

**D7 — Audit: dedicated immutable action types.**
Distinct hash-chained `AuditEvent` actions — **`ESTIMATE_CANCELLED`, `ESTIMATE_DESCOPED`,
`BASELINE_COMMITTED`, `ESTIMATE_REBASELINED`, `CALIBRATION_EVIDENCE_FLAGGED`** — never a generic
`ESTIMATE_UPDATED`. Each captures actor, timestamp, CR id, previous state/value, resulting
state/value, mandatory reason (user-initiated), relevant baseline/version ids, and the calibration
eligibility impact. **Re-baseline** retains references to **both** the previous and the newly
committed baseline (never overwriting). **`CALIBRATION_EVIDENCE_FLAGGED`** references the CR that
became ineligible **and every affected applied calibration version**, without modifying those
historical versions.

## Impact on DEC-007

Once accepted and implemented, the A3 eligibility predicate in DEC-007 extends to exclude the
cancelled / descoped / re-baselined states. Until then, DEC-007 A3 runs the representable subset
and a CR in one of those real-world states (still COMPLETED + actuals) is included.

## Out of scope

Implementation. This record only defines the problem and the decisions required. A separate
accepted version + tasks will cover the schema, workflow, RBAC, audit, and calibration changes.
