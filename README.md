# Estimaite — Enterprise Agile Estimation & Delivery Economics

Governed web application for estimating software-delivery scope, effort, resources, duration, cost, AI productivity impact, delivery risk and post-delivery calibration.

This is not a simple story-point calculator. The chain is:

Scope → Complexity → T-Shirt → SP / ROM → Dev & QA → Capacity → Resources → Sprints → Cost → AI Impact → Governance → Approval → Actuals → Calibration

## Quick start

The app is on branch `cursor/agile-estimator-mvp-cce6`. GitHub `main` is only a stub README — cloning `main` and running `npm run dev` will fail.

```bash
git clone -b cursor/agile-estimator-mvp-cce6 https://github.com/ashish-vxii76/Estimaite-NEW-.git estimaite
cd estimaite
npm install
npm run dev
```

If you already cloned the repo:

```bash
git fetch origin
git checkout cursor/agile-estimator-mvp-cce6
npm install
npm run dev
```

Open **http://localhost:3456** for the landing page (same computer as `npm run dev`). After sign-in you land on **http://localhost:3456/home**.

`npm run dev` binds port **3456**, creates `.env` if needed, syncs SQLite, and seeds demo users when the database is empty.

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
