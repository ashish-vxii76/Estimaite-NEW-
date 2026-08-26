# Architecture

The calculation engine lives in `src/domain/estimation` and must stay independent of React and Prisma.

- UI and API call `calculateEstimate(input, config)`.
- Config must satisfy `validateConfig` before it can be persisted (`saveConfigVersion`) — weights sum to 1.00, bands are monotonic, multipliers and rates are non-negative, team sizes positive. The engine will not compute against config the boundary rejects.
- Persistence stores a `configurationVersionId` and a `rateVersionId` on every estimate. `rateVersionId` is a **content hash of the commercial rates** (`teamCostMappings` + `locationDailyRates`), so it changes whenever rates change.

## What "approved history" actually seals

An approved estimate re-derives its **complexity, sizing and governance** from the *stored configuration payload* (loaded by `configurationVersionId`, not the active version), so those are reproducible after later config changes. Its **commercial cost** is sealed as the frozen `resultJson` snapshot plus the `EstimateVersion` history and the tamper-evident audit trail — it is **not** re-derived from pinned commercial inputs, because the team roster and rate card are still read live at recompute time. Full input-level pinning of rates + roster is deliberate Phase 2 work; until then, treat the sealed output + audit as the record of "what we approved", not a promise to re-run the commercial calculation from pinned inputs.

The audit trail is **hash-chained** (`prevHash`/`hash` on every `AuditEvent`, written only via `appendAuditEvent`); `verifyAuditChain()` detects any altered or deleted event.

MVP stack: Next.js 15 App Router, Auth.js credentials, Prisma + SQLite (portable default; swap `DATABASE_URL` for PostgreSQL in production), Zod validation, Vitest.
