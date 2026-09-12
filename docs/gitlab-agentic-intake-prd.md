# PRD — GitLab Agentic Intake

**Date:** 2026-09-07 (rev. 2026-09-12 — ticket-level selection; evidence-based field population; §6.3 inline provenance)
**Status:** Draft for sign-off (no implementation started)
**Branch:** `feat/gitlab-agentic-intake` (isolated; feature-flagged after merge)
**Owner:** Ashish Joshi
**Related decisions:** [[DEC-015]] config cascade, [[DEC-016]] scope-driven admin tiers, RBAC redesign 2026-09, crew-budget approval lifecycle.

---

## 1. Summary

Add an **agent-assisted intake pipeline** that pulls Issues and Epics from GitLab and turns
each into a **DRAFT estimate** with the wizard's input questions pre-answered by **Claude Opus 4.8**,
then routes the draft to crew leadership for **human review, edit, and submission** through the
*existing* estimate lifecycle.

This is an **additive enhancement to the master app** — same repo, engine, DB, RBAC, lifecycle and
notifications. It feeds the existing pipeline; it does not replace or fork it.

### 1.1 Design decision — the *computation* stays deterministic (non-negotiable)

We explicitly considered making the **estimation computation itself agentic** and **rejected it.** The
governed **engine + Admin config remain the sole system of record** for every output — T-shirt, story
points, AI-adjusted cost, delivery flags, DoR/dimension scores, rounding. Agentic AI is confined to
**authoring the inputs** a human then reviews; it never produces a governed number.

Why deterministic computation stays:
- **Reproducibility** — same CR + same config version → the same number, always. An LLM drifts run-to-run and on every model upgrade; non-deterministic *cost* is an audit/business risk.
- **Auditability** — "why 8 SP / why this cost?" must trace to signed-off config, not a model's opinion.
- **Calibration & comparability** — the deterministic config is what makes two pods' estimates comparable and calibratable.
- **Governance** — config versioning + golden regression assume a deterministic function; there is no "golden" for an opinion (per CLAUDE.md).
- **Moat** — the determinism *is* the product. If the number came from the LLM, Estimaite would be a wrapper anyone could rebuild by pasting a ticket into a chatbot.

Adaptivity, if wanted later, comes from an **AI config-calibration assistant** that *proposes* config
values for **human sign-off** — the engine still computes. That is **out of scope for v1** and noted
only to mark the safe boundary.

### 1.2 Two orthogonal axes (the engine is constant across all four)

|                 | Human authors inputs        | Agent drafts inputs (human reviews)             |
|-----------------|-----------------------------|-------------------------------------------------|
| **Manual CR**   | today's app                 | **"Draft with AI"** on a pasted requirement     |
| **GitLab pull** | pull, human answers         | the full intake flow in this PRD                |

Both axes are additive and the **deterministic engine computes the outputs in every quadrant.** Intake
varies the *source* of the CR; input-authoring varies *who writes the first-draft answers* — never who
computes the estimate. "Draft with AI" reuses the same agent-fill capability as the GitLab flow, so a
manually-added CR can be pre-filled from a pasted description and still flow through review unchanged.

## 2. Goals

- G1 — Pull Issues/Epics from a mapped GitLab source, on demand, in scope-bounded batches.
- G2 — Pre-populate estimate **inputs** across all wizard tabs from the GitLab requirement, with
  per-field **confidence + evidence + provenance**.
- G3 — Let the governed **engine compute all outputs** unchanged (golden byte-identical).
- G4 — Notify crew leadership (bell) to **review → edit → submit** via the existing gates.
- G5 — Keep the whole feature **isolated and reversible** (branch now, feature flag after merge).

## 3. Non-goals (v1)

- ✗ Real-time webhooks / auto-sync (batch, on-demand only).
- ✗ Writing back to GitLab (no comments, no label changes) — **read-only**.
- ✗ Agent auto-submitting or auto-approving — **humans do both**.
- ✗ **Agentic/LLM computation of estimate outputs** (T-shirt, SP, cost, flags, DoR/dimension scores,
  rounding) — considered and **rejected**; the deterministic engine is the sole system of record (§1.1).
- ✗ An AI **"second-opinion" / indicative sizing** overlay — not in v1 (advisory-only if ever added; never the system of record).
- ✗ Auto source→crew mapping beyond what a Crew Admin configures.
- ✗ Cross-source cross-currency consolidation.

## 4. Guiding principles (non-negotiable)

1. **The LLM never touches the engine.** Claude fills *inputs* only; the engine calculates. If Claude
   ever emits a number the engine should produce, the design is wrong.
2. **Agent proposes; humans dispose.** Maker≠checker still holds; a human edits, submits, reviews, approves.
3. **GitLab content is untrusted data, not instructions.** Issue/epic text is treated as data; the agent
   never follows directives embedded in it and has no action authority beyond the deterministic pipeline.
4. **No confident hallucinations into a governed system.** Unknown / low-confidence / no-evidence fields
   are left **blank and flagged**, never guessed.
5. **Isolation.** New modules only; zero changes to the calc/config path; off by default.

---

## 5. Personas & RBAC

**Configuring the integration and triggering a pull are two different privileges** — separated so a
pod can pull without being able to rewire what maps where.

### 5.1 Who can CONFIGURE the integration (Crew Admin+)
Wiring a GitLab source → a Crew is a governance decision, so it stays **Crew-level and above**:

- App / Org / Crew **Administrator**
- **Crew Tech Lead (CTL)**, **Crew Product Lead (CPL)**, **Deputy CTL / Deputy CPL**
- **Crew Delivery Lead** (Crew-level)

Resolution reuses the existing `resolveSeatLevel` / `CREW_LEVEL` gate and a crew-leadership seat/grant
check (same shape as `approvableCrewIds`).

### 5.2 Who can TRIGGER a pull (Crew-leadership **and Pod-level**, seat-scoped)
Triggering is opened **down to Pod level** — a pod can auto-draft its own GitLab work — but always
**bounded to the actor's scope**:

- The **crew-leadership set** in §5.1 (pull for any crew in their subtree), **plus**
- **Pod-level** users granted `estimates.import` (e.g. a **Pod Delivery Lead**, or a pod Estimator if
  the crew grants it): they may pull **only** from sources whose crew contains **their own pod**, and
  the resulting drafts default to **their pod**. A pod-level trigger can never reach another pod/crew.

> Governance note: this is a deliberate relaxation of the earlier "Pod-level excluded" rule. It is
> safe because (a) the PAT is per-user read-only, (b) the trigger is seat-scoped to the pod, and
> (c) every draft is still HITL — a human reviews and submits; the agent never submits/approves.

### 5.3 New RBAC capabilities
- `integration.gitlab` (RW) — configure connection + source mapping. **Crew Admin+** (§5.1).
- `estimates.import` (RW) — trigger pulls / manage import runs. **Crew-leadership + Pod-level** (§5.2).
- Both are **seat-scoped** (you act only within your subtree). `integration.gitlab` carries a **CREW
  min-level** (like `/portfolio`, `/crew-budgets`); `estimates.import` has **no min-level** but its
  scope is the actor's seat — a pod trigger resolves to that pod only.

### 5.4 Credentials
- **GitLab PAT = per-user**, read-only scope (`read_api`), encrypted at rest, revocable. Each user
  pulls under their own key (attribution + least privilege).
- **Anthropic (Claude Opus 4.8) key = server-side env**, org-level, never per-user, never exposed to the client.

---

## 6. Information Architecture (sections & sub-sections)

### 6.1 Main navigation — new top-level section: **Intake**
Icon: import/branch. Visible to anyone with `estimates.import` — the crew-leadership set **and
pod-level triggers** (§5.2). Single-open accordion, hanging indent + icon, consistent with the rest
of the nav.

- **Intake** (`/intake`)
  - **New import** (`/intake/new`) — the pull wizard (connection check → source → filters →
    **preview & select** → confirm).
  - **Import runs** (`/intake/runs`) — batch-job list; drill-in shows live progress and per-item outcome.

Agent-created drafts land in the **existing Estimates** register (they *are* estimates):
- **Estimates** filter drawer gains a **Source** filter: `Manual` / `GitLab`.
- Rows show an **"Agent draft"** badge; the detail view shows an **Intake / provenance** panel.

### 6.1a "New estimate" entry point — mode chooser
"New estimate" (button + `/estimates/new`) **always** presents a **two-option chooser**:

- **Manual estimate** — today's `EstimateWizard`, plus an optional **"Draft with AI"** assist: paste a
  requirement/description and the same agent-fill capability pre-answers the wizard inputs for review
  (engine still computes). Enabled for everyone with `estimates.create`; the AI assist needs `estimates.import`.
- **From GitLab (auto-draft)** — enters the intake flow (connection → source → filters → preview →
  confirm → agent-drafted estimates).

Both options are **always shown**. For a user **without** `estimates.import`, the "From GitLab" tile is
**visible but disabled**, with a short reason ("Ask your crew to enable GitLab import") — so the
capability is discoverable but access stays governed. The manual tile is never gated beyond
`estimates.create`.

Both the chooser's "From GitLab" option and the **Intake → New import** nav item lead to the **same**
pull flow; Intake additionally provides run history/progress. Manual and GitLab drafts converge in the
one Estimates register (distinguished by the **Source** filter + "Agent draft" badge).

### 6.2 Administration — new sub-section: **Integrations**
Under the existing **Administration** section (icon; sits alongside Access / Organisation / Commercial / Engine):

- **Integrations** (`/admin/integrations`)
  - **GitLab connection** (`/admin/integrations/gitlab`) — the current user's PAT: add / test / revoke,
    scope + status. (Per-user credential, leadership-only screen.)
  - **Source mapping** (`/admin/integrations/gitlab/mapping`) — **Crew Admin** maps a GitLab
    project/group → **Crew** (and optional default **Pod/Team**), enable/disable, per-source defaults.
    Demo seed: `RefineIQ` → **IBRL** crew.

### 6.3 Estimate detail — agent-draft provenance (no standalone panel)
Agent drafts surface provenance **where it is used**, not in a separate panel:
- **Inline field chips** — each agent-proposed field shows an "AI-drafted" chip + confidence, with the
  ticket evidence snippet on expand, right on the field the reviewer edits (Agent/Human per field).
- **Slim intake header** (agent drafts only) — source link (GitLab issue/epic), the import run, and a
  **Re-sync** control (refreshes agent-owned fields; never overwrites human edits).
- **Gap gate in the existing Review tab** — the **"Needs human input"** checklist that blocks submission
  until low-confidence/assumption fields are accepted or edited.
- **Collapsible provenance summary** — an optional read-only roll-up for a reviewer/approver auditing the
  whole draft at a glance (every agent decision + confidence + evidence in one list); collapsed by default.

---

## 7. End-to-end flow

```
User with estimates.import (Crew+ OR pod-level) ─▶ /intake/new
  ├─ connection check (their PAT; prompt to add if missing)
  ├─ pick mapped source (only sources in scope; pod trigger → sources for their pod's crew)
  ├─ filters (state, labels, type: Issue/Epic)   ── milestone NOT used
  ├─ PREVIEW & SELECT   [HITL checkpoint 1]
  │     • lists candidate epics/issues; already-imported ones are HIDDEN by default
  │       ("Show already-imported" toggle reveals them for re-sync)
  │     • user ticks which to estimate — all / some / just one
  └─ optional: default release quarter for the batch
        │ confirm  (ONLY selected items proceed)
        ▼
ImportRun (async, batched) ── deterministic ingest + map known fields (selected items only)
        │  per item, in chunks:
        │   Claude Opus 4.8 answers input questions across all tabs
        │   (schema-locked tools, GitLab text delimited as UNTRUSTED)
        │   → {value, confidence, evidence} per field; unknowns blank+flagged
        ▼
Engine computes ALL outputs (UNCHANGED) ─▶ DRAFT(origin=AGENT, owner=Crew Admin, gaps flagged)
        │ on run complete
        ▼
🔔 bell to the target crew/pod leadership + the triggering user ─▶ human review/edit  [HITL checkpoint 2]
        │  fills required blanks; accept/edit per field
        ▼
human SUBMITS for review  [HITL checkpoint 3 — agent never does this]
        ▼
existing  READY_FOR_REVIEW → REVIEWED (Awaiting approval) → APPROVED   (maker≠checker)
```

---

## 8. Functional requirements

### 8.1 Connection (deterministic)
- F1 — Per-user GitLab PAT: add / test-connection / revoke; store AES-encrypted; never logged; never sent to client.
- F2 — Validate host = `gitlab.com` (config-allowed hosts) and scope is read-only; reject write scopes.

### 8.2 Source mapping (Crew Admin)
- F3 — Map GitLab project/group → **Crew** (+ optional default Pod/Team); enable/disable; seat-scoped.
- F4 — A source can only be mapped to a crew inside the configurer's scope. Demo: `RefineIQ` → IBRL.

### 8.3 Pull wizard + preview & select
- F5 — List selectable sources = mappings in the user's scope. A **pod-level** trigger sees only
  sources whose crew contains their pod; drafts from that run default to their pod (§5.2).
- F6 — Filters: item type (Issue/Epic), state, labels. **No milestone.**
- F7 — **Preview & select (tickets, not fields)**: the pull returns the candidate epics/issues; the user
  ticks which to estimate — **all, a subset, or one**. Selection is **ticket-level only — there is no
  per-field choosing.** Each row is read-only and shows enough to decide: `type · iid · title · state ·
  labels · updated · [link]`, with a header count (e.g. "18 new · 6 already-imported hidden"). Nothing is
  created until confirm; **only selected tickets** become ImportItems/drafts (bounds work + token spend).
- F7b — **On confirm, every mapped field auto-populates** for each selected ticket — GitLab-direct fields
  copied, agent-derived fields proposed, the rest defaulted (§8.6) — then the engine computes and it saves
  as a **DRAFT**. The user never selects which fields come across; the whole new-estimate form is filled.
- F7a — **Already-imported items are hidden by default.** "Already imported" = the item's
  `externalRef` already has a **linked estimate** — *not* merely that it appeared in a past preview
  (a previewed-but-unselected item has no draft, so it still shows as NEW). An **"Show
  already-imported" toggle (off by default)** reveals them so an upstream-edited issue can be
  re-pulled; per-item re-sync also remains available from the estimate detail (F21).
- F8 — Optional per-batch **default release quarter** (else left blank+flagged on each draft).

### 8.4 Import run (async, batched — no hard cap)
- F9 — Confirming starts an **ImportRun** with status `QUEUED → IN_PROGRESS → COMPLETED | PARTIAL | FAILED`.
- F10 — Process in **batches/chunks** with persisted progress (`processed / total`); GitLab pagination
  + rate-limit backoff; **resumable**; per-item status recorded.
- F11 — Idempotency: `externalRef = {projectId, iid, type}` is unique per estimate. Re-pull **links**
  to the existing draft; never duplicates.
- F12 — On completion → create/refresh drafts, fire notifications, mark run complete (or PARTIAL with a
  reported list of skipped/errored items — **no silent truncation**).

### 8.5 Agent fill (Claude Opus 4.8)
- F13 — Input to the model: structured GitLab item (title, description, acceptance criteria, labels,
  comments) **clearly delimited as untrusted data**.
- F14 — Output via **schema-locked tools only** — per input question: `{value, confidence, evidence}`.
  No free-form writes; no output for engine-computed fields.
- F15 — **Two-pass**: (a) extract & map; (b) self-critique against the DoR → produce the
  **"Needs human input"** gap list (missing/contradictory/low-confidence).
- F16 — **Persist-once**: the agent runs at draft creation and its outputs are **stored**. It is *not*
  re-run when someone opens the draft. Re-running only happens via explicit **re-sync**.
- F17 — Every agent field decision is written to the **audit trail** (value, confidence, evidence, source).

### 8.6 Field population — by source (evidence-based)
Every field on the new-estimate form is populated automatically for each selected ticket; **what varies is
the source.** The rule: the agent proposes **only what the ticket evidences** (with confidence + evidence);
everything else is copied, defaulted, or computed. The agent never writes an engine output or a config value.

| Source | Fields | Notes |
|---|---|---|
| **GitLab (direct copy)** | work-item type (Issue→ISSUE, Epic→EPIC), title, description, external ref/URL | deterministic, no AI |
| **Mapping / trigger** | crew, pod | from the source→crew mapping (+ a pod-level trigger's pod) |
| **Agent-proposed from ticket analysis** (confidence + evidence) | complexity-dimension ratings, DoR/readiness answers, **required Dev & QA counts + seniority levels** (sized from scope/risk) | unknown / low-confidence → left blank + flagged in the gap gate |
| **Default (for now)** | `devAiProductivity` / `qaAiProductivity` = **0** | revisit once groundable in your own actuals |
| **Config (never AI)** | resource-level rate catalog, location rates, rounding / costing semantics | the estimate references config; it never sets rates |
| **Engine (never AI)** | T-shirt, story points, dimension scores, DoR %, AI-adjusted cost, delivery flag, derived sprints, rounding | computed from the inputs above |
| **Human-owned** | release quarter*, review of every agent-proposed field, submit | maker≠checker downstream |

\* release quarter = batch default if set, else blank + flagged (no milestone inference).

**Resourcing note.** `availableDev` / `availableQa` mean **required to deliver this CR** (demand from scope),
not who is free. Under the default `RESOURCE_CONSTRAINED` planning mode the engine **derives sprints** from
these inputs, so the agent proposes the required counts + seniority from ticket analysis and the engine does
the rest. A ticket cannot evidence AI-productivity or true team capacity, so those stay defaulted/human. The
UI label + agent prompt say **"required"** to avoid supply/demand confusion (the DB field keeps its
`availableDev` name).

### 8.7 HITL review & lifecycle
- F18 — Draft is `origin=AGENT`, `owner=Crew Admin` (the target crew's Crew Admin seat; fallback =
  triggering user); crew set so seat-scoped leadership sees it. For a **pod-level** trigger the draft's
  **pod defaults to the triggerer's pod** (§5.2), so it also surfaces to that pod's people.
- F19 — Review UI: per-field agent value + confidence + evidence; **accept / edit / reject**; a draft
  **cannot be submitted** until the "Needs human input" list is cleared (reuses existing validation/DoR gates).
- F20 — **Human** submits for review → existing `READY_FOR_REVIEW → REVIEWED → APPROVED`, maker≠checker unchanged.
- F21 — **Re-sync** (manual): refreshes agent-owned fields from GitLab; **never overwrites human-edited fields**
  (field-level provenance).

### 8.8 Notifications
- F22 — On **pull complete**, in-app **bell** to the target crew's leadership
  (**Crew Admin, CTL, CPL, Deputy CTL, Deputy CPL, Crew Delivery Lead**) **plus the triggering user**.
  When the trigger is **pod-level**, also notify that **pod's leadership** (e.g. the Pod Delivery Lead),
  so the people who own the work see it — not just crew leadership.
- F23 — Notification links to the Import run and the created drafts. No email/Slack in v1.

---

## 9. Data model additions (high level — no engine/config tables touched)

- **GitLabConnection** — `id, userId, encToken, host, scopes, status, lastUsedAt`. (per-user)
- **GitLabSourceMapping** — `id, host, projectOrGroupRef, crewId, defaultPodTeamId?, enabled, configuredById`. (per-source)
- **ImportRun** — `id, sourceMappingId, triggeredById, crewId, podTeamId?, status, total, processed,
  batchSize, filtersJson, selectedRefsJson, defaultReleaseQuarter?, startedAt, completedAt, error`.
  (`podTeamId` set for pod-level triggers; `selectedRefsJson` = the externalRefs the user ticked.)
- **ImportItem** — `id, importRunId, gitlabType, gitlabIid, externalRef, estimateId?, status
  (PENDING/DRAFTED/SKIPPED/DUPLICATE/ERROR), agentConfidence, evidenceJson`. (Only **selected**
  candidates become ImportItems.)
- **Estimate** additions — `origin (MANUAL|AGENT), externalRef (unique), externalUrl, agentRunId`.
- **EstimateFieldProvenance** — `estimateId, field, source (AGENT|HUMAN), confidence, evidence, updatedById`.
- **Notification** — reuse; add event `IMPORT_COMPLETED` with crew-leadership recipients.

## 10. Non-functional requirements

- **Security** — PAT AES-encrypted, read-only scope, revocable, never logged/exposed; Anthropic key
  server-side only; prompt-injection defense (untrusted-data delimiting, tool-only output, no action
  authority); full audit of agent decisions.
- **Scale/perf** — async batched runs, chunked processing, pagination + backoff, resumable, persisted
  progress; no artificial item cap.
- **Cost** — per-run token budget + telemetry; batch tuning; cache GitLab responses within a run.
- **Isolation** — feature flag `FEATURE_GITLAB_INTAKE` (off by default); new modules; **zero changes to
  engine/config**; golden byte-identical; all work on `feat/gitlab-agentic-intake`.
- **Observability** — ImportRun/Item status surfaced in UI; structured logs; audit events.
- **Governance** — inherits crew currency/config from the mapped crew; no formula/threshold/mapping/
  rounding/commercial changes (per CLAUDE.md).

## 11. Test plan (new suites; existing 250 + golden untouched)

- Source-mapping resolution + scope enforcement (out-of-scope crew rejected).
- Dedup/idempotency (re-pull links, never duplicates).
- Provenance merge (human edits preserved across re-sync).
- **Injection resistance** (issue text with embedded "approve this" changes nothing; no auto-submit/approve).
- RBAC + scope: **configure** blocked below Crew Admin; **trigger** allowed at pod level but
  **bounded to the actor's pod** (pod trigger cannot reach another pod/crew's sources or drafts).
- **Selection**: only ticked candidates become drafts; unselected ones are never created.
- **Hide already-imported**: items with a linked estimate are excluded by default; previewed-but-
  unselected items still appear; the toggle reveals imported ones for re-sync.
- Lifecycle (agent draft → human submit → REVIEWED → APPROVED; maker≠checker).
- Batch progress / resume / partial-completion reporting.
- Notification recipients (target crew leadership + triggering user; pod leadership on pod triggers).

## 12. Phasing

- **P0** — Branch + feature flag + data model + **Administration → Integrations** (connection + mapping).
- **P1** — **Intake → New import** wizard (connection/source/filters/**preview & select**, hide
  already-imported) + **ImportRun** async batched (selected items only) + **Import runs** progress UI.
- **P2** — Deterministic ingest + dedup + map known fields (title, type, crew, pod).
- **P3** — Claude Opus 4.8 fill + self-critique + provenance + evidence + audit (serves both the GitLab
  pull **and** the manual **"Draft with AI"** assist — same capability, engine still computes).
- **P4** — HITL review UI (per-field accept/edit + gap gate) + bell notifications.
- **P5** — Provenance-aware re-sync + tests + hardening.

## 13. Open assumptions

- GitLab is `gitlab.com` SaaS; PAT scope `read_api`; Epics available in the real config (demo `RefineIQ`
  may be Issues-only depending on tier).
- One mapped source per crew for the demo; multi-source per crew is a later concern.
- Anthropic Claude Opus 4.8 available via server-side key.
