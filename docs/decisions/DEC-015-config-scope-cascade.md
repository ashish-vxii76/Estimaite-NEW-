# DEC-015 Config scope cascade (App → Company → Crew → Pod)

**Status: ACCEPTED — 2026-09-02.** Signed off: field-level fallback up the chain (a field uses the
Pod's value, else the Crew's, else the Company's, else the App's), and Pod = team rates for now.
Turns the flat per-crew override model
(DEC-011/013/014) into a **four-level inheritance cascade**. Golden Case A/B remain
**byte-for-byte unchanged** (empty cascade → App global, as today).

## The model

Config lives at **four boundaries only** — App, Company, Crew, Pod. **Division / Sub-Division / Stream
carry NO config** (owner decision): they are reporting/roll-up layers with no estimator that consumes
config, so a config there would be an empty pass-through. The org tree can be arbitrarily deep/wide;
config still only lives at the four real boundaries.

**Scope labels (admin, from the scope panel — the deepest selected level wins):**
- All / All / … → **Application global**.
- Company selected, rest All → **Company config — {Company}**.
- Crew selected → **Crew config — {Crew}**.
- Pod selected → **Pod config — {Pod}**.

**Resolution for an estimate (last-wins, field-level):**
```
effective = App global
          ⊕ Company override   (the pod's crew's Company ancestor)
          ⊕ Crew override      (the pod's crew)
          ⊕ Pod override       (the pod/team)
```
Each override is a field-level partial; a field set at a deeper level beats a shallower one. No
override at any level → App global → golden-safe.

## Decisions (proposed)

**D1 — Four scope levels only.** App, Company, Crew, Pod. No Division/Sub-Division/Stream config.

**D2 — Cascade resolution, last-wins, per field.** `resolveCrewConfig` becomes
`resolveScopedConfig(config, pod)` that walks App → Company → Crew → Pod and overlays each level's
approved override fields in order. Reuses the existing field-partial overlay (DEC-013 R0).

**D3 — Store: reuse the override table, keyed by any scope unit.** `CrewMappingOverride` already keys
by an OrgUnit id (`crewId` FK). A **Company is also an OrgUnit**, so a company-level override is just a
row whose scope unit is the Company. The scope *type* is inferred from the unit's `type`
(COMPANY / CREW). Pod-level = the Team record (team rates are already per-team; a dedicated pod override
is added only if a non-rate field ever needs per-pod). The `@@unique([scopeUnitId, table])` still holds.
No migration of existing rows (they are CREW-scoped and stay valid).

**D4 — Admin edits the selected scope; estimates always resolve the full cascade.** The scope panel's
deepest selected level sets what you edit (App/Company/Crew/Pod). An estimate always resolves the whole
chain for its pod, regardless of what any admin has selected.

**D5 — Comparability flags become scope-aware.** A Tier-3 (DEC-014) or mapping/rate divergence at:
- **Company** level → crews *within* that company stay comparable to each other; only *cross-company*
  comparison is affected. (This is the cascade's key benefit — the flat model can't express it.)
- **Crew** level → that crew is incomparable to all others, even within its company (as today).
The roll-up / calibration flags gain a "company-scoped vs crew-scoped" distinction.

**D6 — Golden-safe.** Every level empty → App global → byte-identical. Existing CREW overrides behave
exactly as they do today (they sit at the Crew rung of the same cascade).

## What changes (scope of the refactor)

- `resolveCrewConfig` → cascade walk (App→Company→Crew→Pod); the service merges each level's approved
  fields in order.
- Override service/API: allow a **Company**-scoped override (relax the "must be CREW" guard; infer
  scope type from the unit).
- Scope panel: navigate/scope on **any** selected level (not only Crew); pages edit at the selected
  scope; "Editing: {scope}" label reflects App/Company/Crew/Pod.
- Page shells (MappingPageShell, EstimationConfigCrewShell) and loaders: `activeCrewId` generalises to
  `activeScope = { unitId, type }`.
- Comparability helpers (`listDivergedCrews`, `listPdIncomparableCrews`) become scope-aware (D5).

## Demo note
With one company today, "Company config — UBS" is selectable but behaves like a sub-global (all crews
are under it). Cross-company incomparability only manifests once a second company exists — the model is
correct now and *activates* value as the tree grows.

Related: **DEC-011/013/014** (the per-crew override this generalises), **DEC-010** (person-days
comparability the flags protect), **DEC-007** (calibration).
