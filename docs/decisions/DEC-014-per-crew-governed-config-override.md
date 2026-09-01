# DEC-014 Per-crew governed override of Class-B estimation config

**Status: ACCEPTED — 2026-09-02.** Owner confirmed: rounding stays global (not parameterised), and the
Tier-3 loud-flag + calibration-advisory treatment is as specified. Owner has decided, after an explicit
devil's-advocate review, to allow the previously governed-global estimation-config fields to be edited
**per crew**, as a **governed override** (approval + audit + version-pin) with a **loud incomparability
flag**. This record exists so the trade-off is a signed, conscious choice — it partially reverses the
governance stance of DEC-009 D7 / DEC-013 D3. Golden Case A/B remain **byte-for-byte unchanged**
(no override → global).

## What changes

Estimation config fields split into three tiers by comparability risk (agreed):

**Tier 1 — crew-tunable (Class-A, normal):** `aiMinPct`, `aiMaxPct`, `standardTeamSize`,
`fullTeamRateUtilisationWarning`, **and now `sprintWorkingDays`** (sprint cadence — it changes sprint
counts, not person-days, so it never breaks comparability). Moved out of the governed set.

**Tier 2 — governance policy, per-crew via governed override:** `issueReviewSp`, `issueSplitSp`,
`epicDecomposeSp`, `epicSplitSp`, `indexReviewMin`, `indexSplitMin`, `issueMaxRecommendedSprints`,
`dashboardMinEstimates`. Editable per crew with approval + audit + version-pin. Consequence: cross-crew
*governance analytics* (who splits/reviews most) become scope-dependent.

**Tier 3 — comparability-breaking, per-crew via governed override + LOUD FLAG:**
`complexityMultipliers` (per-t-shirt effort multipliers) and `calibrationMinSamples` (the statistical
confidence floor). These **compute or guard person-days itself**, so a crew diverging here is **no
longer comparable to other crews even in person-days**, and its **calibration becomes advisory-only**
(you can no longer tell "slow" from "differently configured"). Any Tier-3 divergence raises an
unmissable flag on the crew and on the roll-up.

## Field-reality caveats (must be acknowledged)

- **Rounding is NOT a discrete config field.** Rounding is engine behaviour (hardcoded in the
  calculation functions), not a value in `EstimationConfig`. To make it per-crew we would have to
  *parameterise rounding in the engine* — the single most indefensible per-crew knob (identical work →
  different numbers, no business meaning). **This DEC does NOT do that.** If you truly want per-crew
  rounding, it needs its own separate decision and an engine change; I recommend against it outright.
- **Dev/QA split is ALREADY per-crew** — it lives in the issue/epic mapping rows (`devSp`/`qaSp`),
  which are already crew-overridable via DEC-011. No new work; it's covered.
- **`complexityMultipliers` is an object** (`{XS..XXL}`), not a flat scalar, so the scalar save path is
  extended to accept it (validated per key).

## Decisions

**D1 — Governed override, never silent.** Every Tier-2/Tier-3 divergence goes through the existing
opt-in → **admin approval** → version-pin → revert lifecycle, fully audited. Editing a Tier-3 field
requires the same approval; there is no "quiet" path.

**D2 — Loud incomparability flag.** A crew with any **Tier-3** override shows a persistent, high-visibility
banner: *"This crew's estimates are not comparable to any other crew — not even in person-days — and
its calibration is advisory-only."* The roll-up lists such crews distinctly from Tier-2/mapping/rate
divergence (which are only SP/cost-scope-dependent, not PD-broken).

**D3 — Calibration downgrade for Tier-3 crews.** For a crew that overrides `complexityMultipliers`,
calibration suggestions are shown but marked **advisory-only** (its actual-vs-estimate ratio is no
longer a clean signal, because the effort scale itself moved).

**D4 — Golden-safe.** No override → global resolution, byte-identical. Existing crews unaffected.

### Governance guardrails (what still holds)

- **Approval + audit + version-pin** on every divergence; historical estimates never recompute.
- **The flag is mandatory and loud** — the whole point of allowing this is that the cost is visible.
- **Rounding stays global** (not parameterised) — the one line this DEC does not cross.

## Implementation order (proposed; each increment tsc + unit + golden + integration green)

1. **G1** — move `sprintWorkingDays` to Tier-1 (Class-A).
2. **G2** — expose Tier-2 + Tier-3 fields as editable in the crew estimation-config form (behind the
   approved override); extend the scalar save to accept `complexityMultipliers` (per-key numeric).
3. **G3** — Tier-3 detection: a crew whose override changes `complexityMultipliers` (or
   `calibrationMinSamples`) is "PD-incomparable"; loud banner on the config page.
4. **G4** — roll-up: list Tier-3 crews distinctly ("not comparable even in person-days").
5. **G5** — calibration: mark suggestions advisory-only for Tier-3 crews.

Related: **DEC-013** (per-crew config this extends), **DEC-009 D7 / DEC-011** (the Class-A/B line this
partially reopens), **DEC-010** (person-days normalisation this can break), **DEC-007** (calibration
this downgrades for Tier-3 crews).
