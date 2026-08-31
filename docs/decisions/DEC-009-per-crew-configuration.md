# DEC-009 Per-crew configuration (Resource Levels / Size Mappings / Estimation Config)

**Status: ACCEPTED (decisions) — 2026-09-01. Implementation pending (its own governed increments).**
Supersedes the single-global-config assumption of DEC-004 for these three domains. No configuration
code is written until an implementation plan is approved and the data-model prerequisites below are
verified. Golden Case A/B must remain **byte-for-byte unchanged** through every increment.

## Why this exists

Today configuration (Resource Levels, Size Mappings, Estimation Config) is a **single global record**
(DEC-004, `config.json` semantics). Scope only filters what is *viewed*; every crew estimates through
the same parameters. The business requirement is that **each crew estimates in its own context** —
different resource levels, different size mappings, different estimation settings — and that a crew
admin sees and maintains **only their crew's** configuration. A global-with-live-override model was
considered and **rejected by the owner**: each crew must own a **complete, self-contained** copy, not
a delta layered on a shared global.

## Model

```
Global config  (TEMPLATE ONLY — not a live parent)
      │  one-time snapshot copy at crew creation, or on explicit "Copy from global config"
      ▼
    CREW  ── owns a COMPLETE copy of all three config domains + its calibration factor
      │
      ├── Pod (Team) 1 ─┐
      ├── Pod (Team) 2  ├─ estimates resolve the CREW's config; roll UP to the crew
      └── Pod (Team) 3 ─┘   (pods INHERIT crew config — no per-pod config)
```

- The **crew** is the unit of configuration ownership. There is **no live global override
  resolution** at estimation time — a crew's config is read directly, in full, from the crew's own
  record.
- **Pods (Teams) inherit their crew's config.** Per-pod configuration is explicitly **out of scope**.
- **Global config is a template**, used only to seed a crew (see D2). It is not consulted during
  estimation once a crew exists.

## Decisions

### Accepted (2026-09-01)

**D1 — Ownership: each crew holds a complete, independent copy of all three domains.**
Resource Levels, Size Mappings, and Estimation Config are stored **per crew**, each a full record —
not a diff against global. A crew's estimate resolves **only** that crew's config. No crew's
configuration affects any other crew's numbers.

**D2 — Seeding: snapshot-copy from global at creation; re-seedable via an explicit button.**
When a crew is created, its three configs are **initialised as a one-time snapshot copy of the
current global config** — the crew is immediately estimatable, never blank. A **"Copy from global
config"** action is also available per page so a crew admin can re-seed a domain from the current
global template and then edit it. The copy is a **snapshot, not a link**: after copying, the crew's
config is fully independent and future global changes do **not** propagate. This is deliberately
**not** the override model.

**D3 — CRUD: New / Edit / Modify / Delete / Save, per crew, RBAC-gated, audited.**
Crew config pages support create, edit, delete, and save on the crew's own copy. Every mutation is
**audited** (actor, crew, domain, previous → new value) consistent with existing config audit
behaviour. A crew admin may edit **only their own crew**; an app-wide admin may act across crews.

**D4 — Version-pinning: every estimate stamps the config it used; history is immutable.**
When an estimate is calculated/approved, the **resolved crew config is version-stamped onto that
estimate** (or its baseline, per DEC-008 D3). A later change to a crew's config **must not** alter any
prior estimate's numbers. This is the governance guarantee (the engine is a governed model) and is
what keeps the **Golden regression byte-identical**: existing crews — including the golden crew — are
seeded with **today's global values**, so their resolved config is unchanged and the golden outputs do
not move. This also mirrors DEC-008 D8: past applied results are never silently recomputed.

**D5 — Estimation wiring is per crew, end to end.**
Creating an estimate for a pod resolves **that pod's crew config** for the engine, mapping, and all
derived outputs; the resulting actuals roll up to feed **that crew's** calibration (DEC-007), which in
turn updates the **global** baseline numbers (see D6). Config, engine, mapping, calibration, and
roll-up all key off the crew.

**D6 — Calibration is per crew AND global, and stays consistent with per-crew config.**
Per DEC-007, each crew's Days/Point is computed from **that crew's own delivered, approved data**
(effort-weighted, shrinkage-stabilised) and updates as new work completes; the **global/parent
baseline** is the shrinkage anchor and thin-data fallback, and per-crew results **roll up to update the
global numbers**. DEC-009 adds the requirement that a crew's calibration reads actuals produced under
that crew's **version-pinned** config, so the estimate-vs-actual comparison is internally consistent.
No calibration formula, constant, or rounding changes here — this is a wiring and consistency
requirement only.

### Governance guardrails

- **No formula / threshold / mapping-semantics change.** DEC-009 changes *where config lives and how
  it is resolved*, not how any formula computes. Any deviation is a discrepancy to STOP and document
  (CLAUDE.md), not to code around.
- **Golden-first.** Every increment ships with the golden regression green and Golden Case A/B
  unchanged. A no-override crew seeded from today's global must resolve **identically** to today.
- **Version-pinned immutability.** Historical estimates and applied calibration versions are never
  silently recomputed when a crew edits its config (aligns DEC-008 D3/D8).

## Implementation prerequisites (verify before coding — STOP-and-report if absent)

Before the first increment, verify how the current data model represents configuration and whether it
can carry per-crew, versioned config:

1. **Where global config lives today** (table/JSON shape per DEC-004) and whether a crew-scoped config
   record exists or must be added.
2. **A per-crew config store** keyed by crew for all three domains, with a **config version** suitable
   for stamping onto estimates/baselines (D4).
3. **The estimate/baseline schema** — can it hold a config-version reference (DEC-008 D3 baseline is the
   natural home)?
4. **Crew-creation hook** — where to perform the snapshot copy (D2).
5. **RBAC** — a crew-admin capability scoping config pages to the actor's crew (D3).

If any prerequisite is not representable, **stop and report the gap** before writing code (DEC-007 A3
precedent). Split representable vs non-representable parts rather than proxying.

## Implementation order (proposed; each increment: tsc + unit + golden + integration green)

1. **C1 — Data model**: per-crew config store + config version; migration; seed existing crews from
   current global (golden crew included) → prove byte-identical resolution.
2. **C2 — Resolver**: per-crew config resolution at estimation, replacing the global read; pods inherit
   crew. Golden unchanged.
3. **C3 — Version-pinning**: stamp resolved config version onto estimate/baseline (D4).
4. **C4 — CRUD + "Copy from global config"** UI per crew, per domain, RBAC-gated + audited (D2/D3).
5. **C5 — Snapshot-on-create** hook for new crews (D2).
6. **C6 — Calibration consistency** check: crew calibration reads version-pinned actuals; global
   roll-up intact (D6). No constant/formula change.

Related: **DEC-004** (config semantics superseded for these domains), **DEC-007** (per-crew + global
calibration), **DEC-008** (baseline immutability & version pinning), **DEC-010** (cross-crew
comparability — the read-side consequence of independent per-crew config).
