# DEC-007 Bottom-up crew-level calibration (A1–A6)

**Status: ACCEPTED (2026-08-29).** Constants and clarifications below are approved. Implementation
is incremental — A1 → review → A2 → … → A6 — with a review gate between every tier. Each tier
ships with unit tests and, where outputs change, regenerated & re-signed golden expectations.

Calibration moves from a single global, unweighted mean-of-ratios to **crew-level,
effort-weighted, shrinkage-stabilised** calibration, with **per-crew applied parameters and a
global fallback**. This record is the authoritative spec and supersedes the implicit calibration
behaviour in `src/domain/estimation/calibration.ts`.

Calibration adjusts **Days/Point only**. `capacitySpPerSprint` and all other engine parameters
are out of scope.

---

## Approved constants

| Constant | Meaning | Value |
|---|---|---|
| `k` | shrinkage pseudo-count (parent prior strength) | **8** |
| `n_min` | minimum eligible samples to calibrate a cell, else inherit parent | **8** |
| `min_size_pd` | minimum CR estimated effort to be eligible | **2 PD** |
| `[ratio_floor, ratio_cap]` | per-CR ratio clamp | **[0.33, 3.0]** |
| `W` | trailing window | **12 months** (configurable) |
| `max_step` | max Days/Point move per Apply (normal) | **±20%** |
| `cv_flag` | dispersion → low-confidence flag | **0.5** |

---

## Current behaviour being superseded

```
per resource level L:
  avgRatio(L)  = mean over CRs-with-actuals of (actual_effort / estimated_effort)   [unweighted]
  suggested(L) = current_daysPerPoint(L) × avgRatio(L)
```
Single global config; scope only filters which CRs are viewed. PRD display gate: "calibration
bars ≥ 3 actuals/level" (retained for *display*; see A2 for the *application* floor).

Weakness: the unweighted mean lets a tiny CR swing the parameter as hard as a large one, and
there is no per-crew accuracy or sample-size safeguard.

---

## A1 — Effort-weighted ratio-of-sums

```
For each resource level L (see attribution note), over the eligible CR set in scope:
  ratio(L)     = Σ actual_effort_pd(cr) / Σ estimated_effort_pd(cr)
  suggested(L) = current_daysPerPoint(L) × ratio(L)
```

Replaces the unweighted mean. Effort-weighted, so large CRs count in proportion to their size,
and the rollup is **associative**. In the end state the aggregation key is (crew C × level L);
A1 alone keeps today's grouping and today's global apply — the per-crew dimension arrives with A5.

**Effort sources (confirmed):** `actual_effort_pd = actualDevPd + actualQaPd` (`ActualDelivery`);
`estimated_effort_pd = adjustedDevEffortPd + adjustedQaEffortPd` (estimate `resultJson`).

**Attribution (A1 scope decision):** A1 preserves today's attribution exactly — the *combined*
dev+qa effort ratio is filed under the estimate's **Dev resource level** (`devResourceLevel`).
Consequently QA resource levels receive no samples and remain uncalibrated. Splitting
dev-effort-under-dev-level and qa-effort-under-qa-level is a **separate open decision** (see Open
items); it is deliberately **out of A1** so every A1 golden delta is explained solely by the
mean → ratio-of-sums weighting change.

## A2 — Shrinkage toward parent + minimum-sample floor

```
ratio_used(C,L) = (n · ratio(C,L) + k · ratio_parent(C,L)) / (n + k)

  n            = eligible sample count for (C,L)
  k            = 8
  n_min        = 8
  if n < n_min → do NOT calculate or apply a crew-specific calibration for (C,L);
                 inherit the parent value unchanged.
```

**Parent chain (verified against the data model).** The org tree is a self-referential `OrgUnit`
hierarchy via `parentId`, with levels `COMPANY → DIVISION → SUB_DIVISION → STREAM → CREW`; pods
(`Team.crewId`) hang under a crew and are not OrgUnits. The real ancestor chain from a crew is
therefore **CREW → STREAM → SUB_DIVISION → DIVISION → COMPANY** — deeper than an earlier
shorthand that skipped STREAM and SUB_DIVISION. Shrinkage walks **every real ancestor level** via
`parentId`. There is no "global" OrgUnit; `COMPANY` is the top, and the **global baseline**
(`GLOBAL_BASELINE_RATIO = 1.0`) is the terminal fallback above it. This 1.0 is a **ratio meaning
"no calibration adjustment"** when neither the cell nor any ancestor has sufficient eligible
evidence — it is **not** a Days/Point baseline. The currently resolved Days/Point is left
unchanged because the applied ratio is 1.0.

"Inherit the parent" means the **nearest ancestor that itself satisfies `n_min`** (aggregated at
that level with the same A1/A3 rules); if no ancestor up to COMPANY qualifies, use the **global
baseline** (ratio 1.0, always valid, no `n_min`).

`n_min = 8` sits above the existing PRD "≥3 actuals/level" *display* gate; ≥3 still governs
*display* of bars, 8 governs *application*. At n = 8 the shrinkage yields a deliberate 50/50 blend
with the parent; a cell earns majority weight only as n grows past k — this double safeguard
(hard floor + graded shrinkage) is intended.

## A3 — Eligibility + outlier damping

Target eligible CR: status = COMPLETED with **finalised** actuals; **not** cancelled / descoped /
re-baselined after estimation; estimated effort ≥ `min_size_pd` (2 PD).

**Enforcement status (implemented split — Option 3).** Only the parts explicitly representable in
the current data model are enforced by A3:
- ✅ **status = COMPLETED** (explicit status) **and an `ActualDelivery` row present** — this is
  how "finalised" is represented today (there is no separate actuals-lock flag; actuals remain
  editable via upsert);
- ✅ **estimated effort ≥ `min_size_pd` (2 PD)**;
- ✅ **per-CR outlier clamping** (below).

**Deferred — target policy, NOT yet enforceable.** The exclusions **cancelled**, **descoped**, and
**re-baselined-after-estimation** are **not** applied, because those lifecycle states do not exist
in the current data model (no `CANCELLED` status, no descoped flag, no baseline/re-baseline
marker; `EstimateVersion` is a generic snapshot log, not a baseline semantic). Per governance,
these are **not** proxied or inferred. They remain part of the target calibration policy and
become enforceable only once the lifecycle semantics are introduced — specified separately in
**DEC-008**. Until then, a CR that was in reality cancelled/descoped/re-baselined but still carries
status COMPLETED + actuals will be included.

**Authoritative outlier definition** (preserves effort-weighted ratio-of-sums):

```
raw_ratio_i      = actual_i / estimated_i
clamped_ratio_i  = clamp(raw_ratio_i, 0.33, 3.0)
adjusted_actual_i = estimated_i × clamped_ratio_i
ratio(C,L)       = Σ adjusted_actual_i / Σ estimated_i
```

With no outliers this is identical to A1's ratio-of-sums; a single mis-scoped CR contributes at
most `ratio_cap ×` its own estimate. The clamp is applied **at every aggregation level**
(crew, stream, sub-division, division, company) so shrinkage parent ratios are clamped consistently.

## A4 — Recency: trailing window

**Authoritative recency field: `ActualDelivery.finalisedAt`** (added by A4). It is a
system-controlled timestamp set server-side when actuals are authoritatively captured (estimate →
COMPLETED). A4 **must** use it, and **must not** use or infer recency from `completionDate`,
`ActualDelivery.createdAt`, or `Estimate.updatedAt`.

```
eligible ⟺ finalisedAt != null AND finalisedAt >= (now − W),  W = 12 months (configurable)
```

- `finalisedAt == null` → **not** calibration-eligible.
- Boundary is **inclusive** (`>=`). No exponential decay.
- **No auto-expansion:** if fewer than `n_min` eligible observations exist *within* the window, the
  cell inherits its parent under A2 — the window is **not** widened to pull in older history.
- **No backfill:** existing rows lacking a trustworthy finalisation instant are left `null`
  (ineligible), never populated with an invented timestamp.
- **Edits don't move recency:** re-editing captured actuals does **not** change `finalisedAt` (set
  once, on first capture). Whether a legitimate re-finalisation should re-stamp it — and actuals
  immutability generally — is deferred to **DEC-008**.

## A5 — Per-crew stored parameters + global fallback

> **GOVERNANCE GATE — A5 is blocked on DEC-008.** A5 turns calibration from *analysis* into
> *governed state* (persisted, applied per-crew Days/Point overrides). The cancelled / descoped /
> re-baselined eligibility semantics (DEC-008) must be **accepted and implemented before** A5 may
> persist or apply any per-crew override — parameters must not be operationally applied on top of
> a sample set that cannot yet exclude those states.

- Config gains **per-crew Days/Point overrides**: `{ crewId → { resourceLevelId → daysPerPoint } }`.
- Effort resolution: `daysPerPoint = crewOverride(crewId, L) ?? globalDefault(L)`.
- **Uncalibrated crews use the global default → behave exactly as today** (protects existing
  golden estimation cases; verify, don't assume).
- Overrides are **versioned, approval-gated, and audited** exactly like the global config.
- **Change guardrail:** a single Apply may move a Days/Point by at most **±20%** per calibration
  cycle. A larger move is permitted **only** through an explicit authorised override, with the
  reason captured in the audit trail.

## A6 — Confidence / quality indicator (not a formal CI)

The calibration output distinguishes three separate measures:
- **sample sufficiency** — `n`;
- **systematic bias** — `ratio_used`;
- **dispersion** — coefficient of variation (CV) of per-CR ratios; flag the cell
  **inconsistent / low-confidence** when `CV > cv_flag` (0.5).

A **formal statistical confidence interval is NOT presented** unless and until its calculation
method is explicitly defined and tested. A quality/confidence indicator derived from the three
measures above is sufficient in the interim. (Governance "Suggest" step surfaces n, bias, change
magnitude, and this quality flag — not a CI.)

---

## Governance flow

1. **Compute** — read-only; any user may view calibration within their org scope.
2. **Suggest** — surface `n`, the change magnitude (current → suggested), and the A6 quality flag.
3. **Apply** — `calibration.apply` (RW) only; must respect the A5 ±20% guardrail (larger needs an
   authorised override with reason); writes a **new versioned per-crew override** with full audit
   (who, when, sample set, window).

## Golden Dataset impact

- **Estimation** Golden Case A / B are **unaffected**: with global fallback and no seeded crew
  overrides, every crew resolves to the global Days/Point → identical outputs. Verify at A5.
- **Calibration** golden expectations **change at A1** (formula change). New/updated fixtures per
  tier; expected values are regenerated and **re-signed as part of accepting each tier** — never
  edited ad hoc to make tests pass. Every changed expectation must be explained by the accepted
  formula for that tier.

## Open items (tracked, not yet decided)

- **Dev/QA attribution — OPEN, not resolved by this DEC.** A1 keeps today's behaviour: combined
  Dev + QA effort is attributed under the **Dev** resource level, and QA resource levels receive no
  samples. This is accepted for **A1 only** as *current behaviour*, and must **not** be interpreted
  as the final target calibration model. Splitting dev-effort-under-dev-level and
  qa-effort-under-qa-level (calibrating QA levels) is a separate modelling decision requiring its
  own approval. It matters increasingly from A2 onward: once shrinkage runs by `(crew, resource
  level)`, the implementation must not silently harden this temporary attribution into the
  architecture. Revisit and decide explicitly before or during A5.

## Implementation sequence (review gate between each)

1. **This record** — ACCEPTED. ✅
2. **A1** effort-weighted ratio-of-sums (attribution preserved) + tests + regenerated golden. ✅
3. **A2** shrinkage + min-sample floor + parent-chain resolution (pure) + tests. ✅
4. **A3** eligibility + outlier damping — **representable subset only** (COMPLETED + actuals present
   + `min_size_pd` + clamping); cancelled / descoped / re-baselined deferred to **DEC-008**. ✅
5. **A4** trailing window on authoritative `finalisedAt` + tests. ✅
6. **A5** per-crew stored/applied params (schema + effort resolution + ±20% guardrail) + tests;
   **verify Golden Case A/B unchanged**. **BLOCKED on DEC-008** (governance gate). ← next
7. A6 quality indicator (n / bias / dispersion) + tests.
