# DEC-013 Per-scope rates & estimation config (crew / pod overrides)

**Status: ACCEPTED — 2026-09-01.** Signed off to "follow the mappings" (DEC-011) exactly: same scope
panel, Global / Copy-from-global / crew-specific, opt-in → admin-approve → version-pin → revert, and
the same governed-vs-tunable discipline (governed mechanics stay global, as complexity dimensions did).
Touches commercial costing and governed thresholds, so those guardrails hold. Golden Case A/B remain
**byte-for-byte unchanged** through every increment.

**Store decision (simpler + safer than a migration):** three of the four domains are **crew-scoped**,
so they reuse the existing **`CrewMappingOverride`** table by adding new `table`/domain values — no new
table, no migration, no pod-FK problem. **Team Sprint Rates are already per-pod** (each `Team` record
holds its own rates), so they need **no override store at all** — just the scope panel + Pod selector
over the existing per-team editing. This supersedes D4's `ScopedConfigOverride` proposal.

## Scope (the four domains and their level)

| Domain | Admin page | Override level | Notes |
|---|---|---|---|
| Location Sprint Rates | `/admin/cost-mapping` (`costMappings`) | **Crew** | New per-crew override |
| Location Daily Rates | `/admin/daily-rates` (`locationDailyRates`) | **Crew** | New per-crew override |
| Team Sprint Rates | `/admin/team-cost-mapping` (`teamCostMappings`) | **Pod** | *Already effectively per-pod* — see D1 |
| Estimation Config | `/admin/estimation-config` (scalars) | **Crew** | Crew-tunable fields ONLY — see D3 |

All get the **same** treatment as the mapping pages: the left Company→Crew(→Pod) scope panel, an
"All = global" default, **Global / Copy-from-global / Crew-(or Pod-)specific**, opt-in →
admin-approved → edit → version-pinned → revert.

## Decisions (proposed)

**D1 — Team Sprint Rates are per-Pod, and largely already are.**
Each `Team` (Pod) already carries its own `resourceSprintRate`, `teamSprintRate`, `mappedLocation`,
`currency`, and an estimate **pins the pod's rates** at creation. So "Team Sprint Rates at Pod level"
is mostly a **UI alignment** (present the per-pod rates behind the scope panel + Pod selector), not a
new engine mechanism. The only genuinely new part is wrapping edits in the opt-in/approve/version
lifecycle for consistency. **New override key: Pod (teamId)** — all DEC-011 infra is crew-keyed, so
the override store must generalise to a scope of `CREW` **or** `POD`.

**D2 — Location rates (Sprint + Daily) are per-Crew overrides.**
Global location rates stay the canonical baseline; a crew may opt into its own copy (approved,
seeded from global via "Copy from global", version-pinned). No override → the crew resolves the global
location rates → golden-safe.

**D3 — Estimation Config: crew-tunable vs governed-global (BLOCKER, the D7 split again).**
`EstimationConfig` scalars are **not** homogeneous. Only **Class-A** may be crew-editable:
- **Class-A (crew-tunable):** `aiMinPct`, `aiMaxPct`, `standardTeamSize`, `fullTeamRateUtilisationWarning`,
  and similar crew-local planning inputs.
- **Class-B (governed-global, NOT crew-editable):** `sprintWorkingDays`, the Dev/QA split, all
  rounding behaviour, and the governance thresholds `issueReviewSp` / `issueSplitSp` /
  `epicDecomposeSp` / `epicSplitSp` / `indexReviewMin` / `indexSplitMin`,
  `dashboardMinEstimates` / `calibrationMinSamples`. These stay global; shown read-only per crew.
The exact field list is confirmed against `src/domain/estimation/types.ts` before coding; anything
uncertain stays Class-B by default.

**D4 — One generalised override store.**
Replace/generalise `CrewMappingOverride` into a `ScopedConfigOverride` table:
`{ scopeType: CREW|POD, scopeId, domain, status, payload, version, audit… }`. `domain` ∈
`{ISSUE, EPIC, COMPLEXITY, LOCATION_SPRINT_RATES, LOCATION_DAILY_RATES, TEAM_SPRINT_RATES,
ESTIMATION_CONFIG}`. DEC-011's three mapping domains migrate onto it unchanged (data migration keeps
existing rows). Global default when no APPROVED row → golden-safe.

**D5 — Resolution stays crew-first, pod-aware.**
`resolveCrewConfig` extends to overlay a crew's approved LOCATION_* and Class-A ESTIMATION_CONFIG
fields; the estimate additionally applies its **Pod's** TEAM_SPRINT_RATES (already pinned from the
team record). No formula change — only which values are resolved. No override of any kind → identical
to today.

### Governance guardrails

- **Costing is governed.** Per-crew/per-pod rates are permitted because rates are inherently local,
  but every divergence is **approved, audited, and version-pinned**; historical estimates never
  recompute.
- **Class-B stays locked.** Governed thresholds/rounding/Dev-QA split are never crew-editable (D3).
- **Golden-first.** Every increment ships golden green; no-override resolves byte-identically.
- **Comparability.** Per-crew rates make cross-crew *cost* comparison scope-dependent — cross-crew
  cost rollups should note the divergence (mirrors DEC-011 M5 for SP).

## Implementation order (proposed; each increment tsc + unit + golden + integration green)

1. **R0 — Generalise the store** (`ScopedConfigOverride`, migrate the 3 mapping domains) + resolver.
2. **R1 — Scope panel supports a Pod level** where the domain needs it (Team Sprint Rates).
3. **R2 — Location Sprint Rates** per-crew page (opt-in/approve/edit/version/revert).
4. **R3 — Location Daily Rates** per-crew (same).
5. **R4 — Team Sprint Rates** per-pod page (wrap existing per-team rates in the lifecycle).
6. **R5 — Estimation Config** per-crew, Class-A fields only; Class-B shown read-only.
7. **R6 — Cost comparability note** on cross-crew cost rollups.

Related: **DEC-011** (mapping override pattern this extends), **DEC-009** (Class-A/B split, D7),
**DEC-007/008** (calibration, baseline immutability), **DEC-004** (config semantics).
