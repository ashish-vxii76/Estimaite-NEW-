# Architecture

The calculation engine lives in `src/domain/estimation` and must stay independent of React and Prisma.

- UI and API call `calculateEstimate(input, config)`.
- Persistence stores a `configurationVersionId` and `rateVersionId` on every estimate.
- Approved history must reproduce original results after later configuration changes by loading the stored configuration payload, not the active version.

MVP stack: Next.js 15 App Router, Auth.js credentials, Prisma + SQLite (portable default; swap `DATABASE_URL` for PostgreSQL in production), Zod validation, Vitest.
