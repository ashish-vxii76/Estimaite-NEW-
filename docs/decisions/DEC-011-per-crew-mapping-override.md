# DEC-011 Per-crew mapping override (opt-in, governed)

**Status: ACCEPTED — 2026-09-01.** Signed off for all three pages (Issue, Epic, Complexity mapping)
with the scope-panel + global/crew-specific toggle visual. Partially reopens the Class-B lock of
DEC-009 D7 for **three named mapping tables only**. Golden Case A/B must remain **byte-for-byte
unchanged** through every increment.

## Why this exists

DEC-009 D7 locked all "Mappings & thresholds" as governed-global. The owner requires that these
mappings be **global by default, and available at crew level for a crew that does not want global** —
i.e. an **opt-in per-crew override**, not free CRUD and not a blanket fork of the governed model. This
record authorises that override for a **bounded** set of tables, with governance guardrails.

## Scope (exactly these — nothing else changes)

**In scope (per-crew opt-in):**
- **Issue mapping** (`issueMappings` + `issueStoryPointMappings` / `allowedIssueStoryPoints` as the
  coherent issue set).
- **Epic mapping** (`epicMappings` + `epicRomMappings`).
- **Complexity mapping** (`complexityMappings` + `complexityBands` — the complexity→t-shirt/governance
  banding).

**Explicitly OUT of scope (stay governed-global):**
- **Complexity dimensions & weights** (`complexityDimensions`, `complexityMultipliers`) — all crews
  score complexity on the same scale; only the banding may differ.
- All governance **thresholds** (`issueReviewSp`, `issueSplitSp`, `epicDecomposeSp`, `epicSplitSp`,
  `indexReviewMin`, `indexSplitMin`, `sprintWorkingDays`), Dev/QA split, rounding, costing semantics.
- Resource levels (already per-crew via DEC-009 Class-A) and rates (`config.rates`).

## Decisions (proposed)

**D1 — Opt-in at the whole-table level; global is the default.**
Per crew, per in-scope table, a switch: **Use global (governed)** — the default, stores nothing, always
current — or **Use crew-specific**. A crew never starts blank: opting in **copies the current global
table** as the crew's starting point (the "Copy from global" seed). Opt-in is at the **table level**,
not row-by-row, because a mapping table must stay internally coherent (t-shirt → SP → dev/QA → PD).

**D2 — Opting in is admin-approved and audited.**
A crew lead **requests** crew-specific mappings for a table; an **administrator approves** before it goes
live (one approval per table per crew). Record requester, approver, timestamp, and reason. "Revert to
global" drops the crew copy and re-inherits (also audited). Editing rows **within** an already-approved
crew table is the crew lead's to do (no per-edit approval), but the initial divergence is gated.

**D3 — Version-pinning; history is immutable.**
The crew's mapping set is **version-pinned onto its estimates** (via the existing baseline / config
version mechanism, DEC-008 D3 / DEC-009 D4). A later edit to a crew's mappings never mutates prior
estimates; it creates a new version applied forward only.

**D4 — Golden-safe by construction.**
A crew on "Use global" (every crew today) stores no override and resolves **identically** to the current
global config. Golden Case A/B are unaffected — proven at each increment, same argument as DEC-009
Class-A.

**D5 — Comparability: opted-in crews compare only in person-days.**
Once a crew runs its own mappings, its story points are **not comparable** with other crews'. Any
cross-crew rollup **must** use person-days, never raw SP (DEC-010). This is the accepted price of the
flexibility; the UI must state it wherever a crew is on crew-specific mappings.

**D6 — Scope panel drives the editor (RBAC-wired).**
Each per-crew mapping page carries a **persistent Company→Division→Sub-Division→Stream→Crew scope
panel** (not the filter drawer). Levels are **auto-selected and read-only** from the signed-in user's
**active role grant** (Switch-Role model: `lockedUnitIds` / `lockedTeamId`); an app-admin gets fully
selectable levels. The resolved **Crew** is the crew the toggle, table, and Save act on. A user can only
open/edit mappings for crews inside their scope.

### Governance guardrails

- **Bounded reopening.** Only the three tables in Scope. Everything else in DEC-009 D7 Class-B stays
  locked. Widening scope needs a new decision.
- **No formula change.** DEC-011 changes *which* mapping values a crew resolves, not how any formula
  computes from them. Rounding, Dev/QA split, thresholds, costing are untouched.
- **Approval + audit + version-pin** on every divergence; historical estimates never recomputed.
- **Golden-first.** Every increment ships golden green with Case A/B unchanged.

## Data model (proposed — verify before coding)

Do **not** nest full per-crew mapping copies inside the monolithic `ConfigurationVersion` blob (it would
bloat every global version and churn versions on crew edits). Add a **dedicated table**, e.g.
`CrewMappingOverride`:

| field | meaning |
|---|---|
| `crewId` | the crew |
| `table` | `ISSUE` \| `EPIC` \| `COMPLEXITY` |
| `status` | `REQUESTED` \| `APPROVED` \| `REVERTED` |
| `payload` | the crew's mapping rows (JSON), seeded from global on opt-in |
| `version` | monotonic; the value pinned onto estimates |
| `requestedBy` / `approvedBy` / timestamps / `reason` | audit |

Resolution: an estimate for a crew with an **APPROVED** override for a table resolves that table from the
override; otherwise it resolves global. No override → global → golden-safe. Extends the DEC-009
`resolveCrewConfig` seam with a mapping-override lookup (still pure, still I/O-free at the domain layer;
the service supplies the crew's approved overrides).

## Implementation order (proposed; each increment tsc + unit + golden + integration green)

1. **M0 — Data model + resolver**: `CrewMappingOverride` table; extend resolution so "no approved
   override → global" (prove byte-identical golden).
2. **M1 — Scope panel** (RBAC auto-select + read-only) shared by the three pages.
3. **M2 — Issue mapping** page: toggle, Copy-from-global, approval request/approve, edit/add/delete/save,
   version-pin, revert.
4. **M3 — Epic mapping** (same pattern).
5. **M4 — Complexity mapping** (mapping/bands only; dimensions stay global).
6. **M5 — Comparability guard**: ensure cross-crew views use person-days for any crew on crew-specific
   mappings (ties to DEC-010).

Related: **DEC-009** (per-crew config, the Class-A precedent + D7 lock this bounds), **DEC-008**
(baseline/version immutability), **DEC-010** (person-days normalisation for cross-crew), **DEC-004**
(config semantics).
