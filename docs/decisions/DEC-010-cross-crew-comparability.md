# DEC-010 Cross-crew comparability (normalisation & analytics)

**Status: ACCEPTED (principle) — 2026-09-01. Implementation deferred LONGER than DEC-009.**
Opened as the read-side consequence of DEC-009. This is an **analytics / reporting layer only**. It
**must not** change how any crew estimates, nor any engine formula, threshold, mapping, or rounding.
Golden Case A/B remain **byte-for-byte unchanged**.

**Deliberately not built yet.** DEC-010 only pays off with **multiple calibrated crews** and a real
cross-crew reporting ask; building it now (the seed has one crew) would be speculative. The *principle*
is locked here — chiefly so nobody ever hand-types pairwise ratios — but implementation waits until the
demand is concrete. DEC-009 (per-crew config) proceeds first and independently.

## Why this exists

DEC-009 makes each crew's configuration independent. A direct benefit is per-crew accuracy; a direct
cost is that **story points are no longer comparable across crews** — a "5-pointer" in Crew A need not
mean a "5-pointer" in Crew B (apples vs oranges). To compare, roll up, or benchmark across crews, we
need a **translation layer**. The owner's instinct — a saved "1 SP of Crew A = 3 SP of Crew C"
mapping — is the right *need*; DEC-010 decides the right *mechanism* for it.

## Decisions

### Accepted (2026-09-01)

**D1 — Normalise to a common neutral unit; do NOT hand-maintain pairwise ratios.**
Cross-crew comparison is done by expressing every crew's points in **one common neutral unit —
effort (person-days)** — using that crew's **calibration factor (Days/Point, DEC-007)**. Any
crew↔crew ratio (e.g. "1 SP Crew A = 3 SP Crew C") is then a **derived, computed output**, not a
stored, hand-typed input. Rationale: a hand-typed pairwise ratio looks authoritative but **rots** the
moment either crew re-configures or its delivery reality shifts, and it does not scale (N crews → N²
pairs to maintain by hand). Calibration already computes the objective, data-derived exchange rate and
**refreshes as new work completes** — that is the source of truth. (Analogy: currencies are held
against one base and every pair is derived, not stored pair-by-pair.)

**D2 — Derived ratios carry calibration confidence, and are de-emphasised vs the neutral unit.**
A derived crew↔crew ratio inherits the **confidence of the underlying calibration** (DEC-007
`n_min`, `cv_flag`). Where a crew's factor is a thin-data parent/global inheritance or is flagged
low-confidence, the derived comparison is **surfaced as low-confidence**, never presented as precise.
Note the **pairwise ratio is the noisiest artifact** — it divides two noisy calibration factors, so
error compounds. The **robust primary view is "everything in person-days"**; the "1 SP A = 3 SP C"
readout is secondary, always confidence-badged, and never shown as a bare precise number.

**D3 — Optional manual override, thin-data fallback only, clearly labelled and audited.**
Where a crew has **too little delivered data to calibrate**, an authorised user may enter a **manual
normalisation factor/ratio** for that crew. It is **explicitly labelled "manually asserted — not
data-derived,"** carries actor + reason + timestamp in the audit trail, and is **superseded
automatically** once the crew accrues enough data to calibrate (data-derived wins). Manual overrides
are the **exception**, never the primary mechanism. To avoid a crew **yo-yoing** between manual and
data-derived at exactly the `n_min` boundary, the switch uses **hysteresis** (data-derived takes over
only once comfortably past the floor, e.g. `n_min + margin`) or an explicit one-way switch — never a
per-run flip at the boundary.

**D4 — Read-side only; zero effect on estimation or the engine.**
Normalisation and its analytics live entirely in the **reporting/analytics layer**. No crew's estimate
changes because of a cross-crew mapping; no engine formula, constant, mapping, or rounding is touched.
This isolation is what guarantees **no movement in the Golden numbers**.

**D5 — Consistent with the calibration hierarchy.**
Per-crew calibration rolls up to the **global/parent baseline** (DEC-007 shrinkage hierarchy).
Cross-crew normalisation uses the **same** per-crew factors and the **same** global anchor, so the
comparison layer and the calibration engine never disagree about a crew's effort-per-point.

### Governance guardrails

- **Analytics layer, not engine.** Any temptation to feed a normalisation factor back into estimation
  is a discrepancy to STOP and document, not to implement.
- **Derived-first, manual-exception.** Stored values are the calibration factors (governed) and the
  rare audited manual override; there is **no stored pairwise matrix**.
- **Golden untouched.** DEC-010 adds no path that can alter a single-crew estimate or golden output.

## What the user sees (illustrative)

- A **normalised view** in analytics where multiple crews' work is expressed in a common unit
  (person-days), so totals and comparisons are meaningful.
- A **derived ratio readout** ("≈ 1 SP Crew A ≈ 3 SP Crew C, low confidence") computed from current
  calibration — with a confidence badge, never a bare number.
- A **manual-override control** (authorised, audited) for thin-data crews, clearly marked as asserted,
  that steps aside automatically once real data is sufficient.

## Implementation prerequisites (verify before coding)

1. **Per-crew calibration factors are queryable** for the analytics layer (DEC-007 output surface).
2. A place to store the **rare manual override** (per crew) with confidence state + audit — no pairwise
   matrix.
3. **Confidence metadata** (`n_min` inheritance, `cv_flag`) is available to the analytics layer for D2.

## Implementation order (proposed; analytics-only, golden green throughout)

1. **N1 — Normaliser**: express per-crew points in person-days via the crew's calibration factor
   (pure read; no engine change).
2. **N2 — Derived ratio + confidence** readout in analytics (D1/D2).
3. **N3 — Manual override** (authorised, audited, auto-superseded) for thin-data crews (D3).
4. **N4 — Normalised roll-up views** across crews (D4/D5).

Related: **DEC-007** (per-crew + global calibration — the exchange-rate source), **DEC-009** (per-crew
config — the cause of incomparability this record resolves), **DEC-008** (immutability of applied
calibration versions the analytics reads).
