# Estimaite — Enterprise Agile Estimation & Delivery Economics

Governed web application for estimating software-delivery scope, effort, resources, duration, cost, AI productivity impact, delivery risk and post-delivery calibration.

This is not a simple story-point calculator. The chain is:

Scope → Complexity → T-Shirt → SP / ROM → Dev & QA → Capacity → Resources → Sprints → Cost → AI Impact → Governance → Approval → Actuals → Calibration

## Quick start

```bash
npm install
npm run dev
```

Open **http://localhost:3456**. `npm run dev` binds port **3456**, creates `.env` from `.env.example` if needed, syncs the SQLite schema, and seeds demo users when the database is empty.

Sign in with `admin@estimaite.local` / `demo1234`.

`npm run db:seed` also loads an 18-item demo register (issues, epics, discovery, completed actuals, and a CHF portfolio budget) so Home, Estimates, Portfolio, and Calibration are populated.

## Product contract

Treat `PRD.md` and `CLAUDE.md` as binding. Do not change formulas, thresholds, mappings, rounding or costing semantics merely to make tests pass.

## Stack

Next.js 15, TypeScript, Tailwind CSS, Auth.js, Prisma, SQLite (MVP), Zod, Vitest, Recharts.

## Demo users

All passwords: `demo1234`

- admin@estimaite.local — Administrator
- eng@estimaite.local — Estimator
- approver@estimaite.local — Approver
- delivery@estimaite.local — Delivery Lead
- finance@estimaite.local — Finance
