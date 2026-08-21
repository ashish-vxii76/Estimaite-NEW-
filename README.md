# Estimaite — Enterprise Agile Estimation & Delivery Economics

**Version 1.0.0** — governed estimate pack (Ready → Size → Plan & cost → Govern → Final review → Actuals → Variance) with admin-customisable catalogues.

Governed web application for estimating software-delivery scope, effort, resources, duration, cost, AI productivity impact, delivery risk and post-delivery calibration.

This is not a simple story-point calculator. The chain is:

Scope → Complexity → T-Shirt → SP / ROM → Dev & QA → Capacity → Resources → Sprints → Cost → AI Impact → Governance → Approval → Actuals → Calibration

## Quick start (v1.0 on `main`)

```bash
git clone -b main https://github.com/ashish-vxii76/Estimaite-NEW-.git estimaite
cd estimaite
npm install
npm run db:seed
npm run dev -- -p 3456
```

If you already cloned the repo:

```bash
git fetch origin
git checkout main
git reset --hard origin/main
rm -rf .next
npm install
npm run dev -- -p 3456
```

Open **http://localhost:3456**. Sign in: `admin@estimaite.local` / `demo1234`.

`npm run dev` creates `.env` if needed, syncs SQLite, and seeds demo users when the database is empty.

## What is in v1.0

- Estimate moments through Final review, Actuals, and Variance (post-approval)
- Admin **Lists & catalogues**: release quarters, Definition of Ready, complexity dimensions (Size 1–5), resource levels
- Size / Issue / Epic mappings, engine thresholds, teams, rates, RBAC

**v1.1 (planned):** GitLab + Claude governed intake assist — not in this release.

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
