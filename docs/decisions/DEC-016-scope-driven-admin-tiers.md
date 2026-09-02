# DEC-016 — Scope-driven admin tiers (App / Org / Crew)

**Date:** 2026-09-02
**Status:** Accepted (enforcement slice shipped)

## Context

Administration was implicitly "App Admin only" in concept, but in practice the
Administration section leaked to any role holding a config **read** grant
(Estimator/Reviewer/Approver hold `config.mappings` R). The owner wants tiered
administration — **App Admin vs Org (Company) Admin vs Crew Admin** — aligned to
the DEC-015 config cascade (App → Company → Crew).

## Decision

1. **No new roles.** Admin tiers are **scope-driven**: one `ADMINISTRATOR` role
   plus the existing delegated feature grants (e.g. `DELIVERY_LEAD` holding
   `config.crewMappings`/`config.crewLevels` RW = Crew admin). The **tier** is the
   org-unit scope of the user's active `RoleGrant`:
   - unscoped / sees-all → **App Admin**
   - Company-scoped → **Org Admin**
   - Crew/Pod-scoped → **Crew Admin**
   Enforcement rides the existing `inScope` / `visibleOrgUnitIds` 403 checks and
   the `resolveCrewScope` cascade — no separate role machinery.

2. **A user is an admin tier iff they can WRITE at least one administration
   surface** (`isAdminTier`, `ADMIN_SURFACES` in `src/lib/rbac.ts`). Pure config
   *readers* are not admins.

3. **RACI (who owns what):**
   | Surface | App | Org (Company) | Crew |
   |---|---|---|---|
   | RBAC matrix, Logins/Users | own | — | — |
   | Global governed thresholds & mappings (the template) | own | read | read |
   | Org tree (multi-company), budgets | own | own subtree | read/own crew |
   | Company-level config/rate/estimation overrides | ✓ | own | inherit |
   | Crew-level overrides (mappings/rates/resource levels/estimation config) | ✓ | approve | own crew |
   | Tier-3 comparability-breaking overrides | approve | approve | request only |
   Approval always sits one rung up. Most of this was already enforced by the
   feature matrix + scope 403s; this decision names the tiers and closes the leaks.

## Shipped

- `isAdminTier(role, matrix)` + `ADMIN_SURFACES` (`src/lib/rbac.ts`), re-exported
  matrix-bound via `src/lib/access.ts`.
- **Menu:** `canSeeNav` gates the `administration` node on `isAdminTier` — pure
  readers (Estimator/Reviewer/Approver/Viewer) no longer see Administration;
  Delivery Lead (Crew admin) and Finance (budget) still do.
- **Section entry:** `/admin` overview redirects non-admin tiers to `/home` and
  shows a tier + scope banner ("App Admin · all companies & crews", etc.).
- **Read gates:** added the missing server-side `redirect("/home")` read guards to
  `/admin/rbac` (App-Admin only via `config.rbac`), `release-quarters`,
  `readiness-criteria`, `complexity-dimensions`, and `resource-mapping` (the last
  had no `auth()` at all). Closes direct-URL read access; writes were already
  API-gated.
- Also fixed: role switcher leaked Next's `NEXT_REDIRECT` control-flow error into
  the UI — re-thrown so navigation happens instead of showing an error string.

## Scope enforcement (added — org tree & budgets)

The first slice named the tiers but did not *constrain admin writes by scope* — a crew-seated
ADMINISTRATOR could still create Companies/Divisions/Crews, delete any crew, seat anyone, and the
crew-budget form showed the whole tree editable. Root cause: scope came from `seesAllTeams(role)`
(an ADMINISTRATOR is blanket sees-all) rather than the seat/grant.

Fix — seat/grant-driven admin scope (`adminOrgScope` in `orgService.ts`), independent of the role
sees-all flag:
- `appLevel` (unseated sees-all admin) = unrestricted; otherwise authority is anchored to the seat/
  grant org unit and its subtree (`visibleIds`).
- Policy helpers: `canCreateUnderParent` (parent in scope; top-level Company is App-only),
  `canWriteUnit` (anchor + descendants), `canArchiveUnit` (strict descendant only — never your own
  anchor or above). Encoded rule: **you create/delete the level below you and edit within your
  subtree; delete-crew belongs to the Stream admin one rung up.**
- Enforced server-side in `POST /api/admin/organisation` (every action) and `POST /api/teams` (pod
  creation), and in `crew-budgets` (now uses `adminVisibleCrewIds`).
- UI: `OrgNodeSetup` filters to the visible subtree, offers create only for creatable levels, and
  shows archive only on strict descendants. `CrewBudgetManager` pre-selects + locks the fixed
  ancestor chain read-only and restricts the crew list to scope.
- Seed: the top admin (`admin@estimaite.local`) is now **unseated** = App admin (can create
  companies). Seat an admin at a Company/Crew to scope them. (Running DBs need a reseed — or removing
  the admin's UBS seat — to regain App-level; a Company-anchored admin still manages all of UBS.)
- Pure policy proven in `tests/unit/orgAdminScope.test.ts`.
- Also fixed: the "Amount (CHF)" label overlapped its input (inline label + input) — label is now a
  block above the field.

## Not done (deferred / needs owner confirmation)

- Fully blocking global mapping-page *reads* for Estimator/Reviewer/Approver would
  require removing their `config.mappings` R cells from the governed RBAC matrix
  (touches the RBAC golden fixture) — not changed unilaterally.
- Distinct Org-admin UX (company-scoped org-tree editing) is exercised only when a
  company-scoped `RoleGrant` exists; the demo seeds a single sees-all admin.

## Guardrails

No estimation-engine / formula / golden impact — this is access wiring only.
111 tests green; golden unaffected.
