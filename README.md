# Estimaite — Enterprise Agile Estimation & Delivery Economics

Governed web application for estimating software-delivery scope, effort, resources, duration, cost, AI productivity impact, delivery risk and post-delivery calibration.

This is not a simple story-point calculator. The chain is:

Scope → Complexity → T-Shirt → SP / ROM → Dev & QA → Capacity → Resources → Sprints → Cost → AI Impact → Governance → Approval → Actuals → Calibration

## Quick start

```bash
cp .env.example .env
npx prisma db push
npm run db:seed
npm test
npm run dev
```

Sign in with `admin@estimaite.local` / `demo1234`.

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
