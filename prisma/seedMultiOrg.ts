import type { PrismaClient } from "@prisma/client";
import { DEFAULT_CONFIG } from "../src/domain/estimation";

// Demo multi-org data: Citi / HSBC / Barclays alongside the existing UBS tree. Idempotent (safe to
// re-run) and independent of the estimation engine, so Golden Case A/B are unaffected. Exercises the
// full access-control model (org/company/crew admin tiers) and every approval state for crew budgets
// and per-crew overrides. Budget amounts stay in CHF to match the current engine (roll-ups format
// CHF); per-company budget currency would be a separate code change.

type CrewSpec = { name: string; pods: string[] };
type StreamSpec = { name: string; crews: CrewSpec[] };
type SubSpec = { name: string; streams: StreamSpec[] };
type DivSpec = { name: string; subs: SubSpec[] };
type CompanySpec = { name: string; currency: string; divisions: DivSpec[] };

const COMPANIES: CompanySpec[] = [
  {
    name: "Citi",
    currency: "USD",
    divisions: [
      { name: "Citi ICG", subs: [{ name: "ICG Markets", streams: [{ name: "Markets Tech", crews: [
        { name: "Falcons", pods: ["Falcons Pod"] },
        { name: "Hawks", pods: ["Hawks Pod"] },
      ] }] }] },
      { name: "Citi PBWM", subs: [{ name: "PBWM Digital", streams: [{ name: "Digital Banking", crews: [
        { name: "Otters", pods: ["Otters Pod"] },
        { name: "Beavers", pods: ["Beavers Pod"] },
      ] }] }] },
    ],
  },
  {
    name: "HSBC",
    currency: "GBP",
    divisions: [
      { name: "HSBC WPB", subs: [{ name: "WPB Payments", streams: [{ name: "Payments Platform", crews: [
        { name: "Dragons", pods: ["Dragons Pod"] },
        { name: "Griffins", pods: ["Griffins Pod"] },
      ] }] }] },
      { name: "HSBC GBM", subs: [{ name: "GBM Risk", streams: [{ name: "Risk Engineering", crews: [
        { name: "Titans", pods: ["Titans Pod"] },
        { name: "Atlas", pods: ["Atlas Pod"] },
      ] }] }] },
    ],
  },
  {
    name: "Barclays",
    currency: "GBP",
    divisions: [
      { name: "Barclays UK", subs: [{ name: "BUK Lending", streams: [{ name: "Lending Tech", crews: [
        { name: "Foxes", pods: ["Foxes Pod"] },
        { name: "Badgers", pods: ["Badgers Pod"] },
      ] }] }] },
      { name: "Barclays International", subs: [{ name: "BI Cards", streams: [{ name: "Cards Platform", crews: [
        { name: "Comets", pods: ["Comets Pod"] },
        { name: "Meteors", pods: ["Meteors Pod"] },
      ] }] }] },
    ],
  },
];

const LEVELS = ["beginner", "intermediate", "senior"];
const LOCATIONS = ["India", "Switzerland"];

export async function seedMultiOrg(prisma: PrismaClient, passwordHash: string) {
  // Idempotent org-unit upsert keyed by (type, name, parentId).
  async function unit(type: string, name: string, parentId: string | null, currency?: string) {
    const existing = await prisma.orgUnit.findFirst({ where: { type, name, parentId } });
    if (existing) {
      if (currency && existing.currency !== currency) {
        await prisma.orgUnit.update({ where: { id: existing.id }, data: { currency, active: true } });
      }
      return existing;
    }
    return prisma.orgUnit.create({ data: { type, name, parentId, active: true, ...(currency ? { currency } : {}) } });
  }

  async function user(email: string, name: string, role: string) {
    return prisma.user.upsert({
      where: { email },
      update: { name, role, active: true },
      create: { email, name, role, passwordHash, active: true },
    });
  }

  async function primarySeat(userId: string, orgUnitId: string, seatType: string) {
    await prisma.orgSeat.updateMany({ where: { userId, isPrimary: true }, data: { isPrimary: false } });
    const existing = await prisma.orgSeat.findFirst({ where: { userId, orgUnitId, seatType } });
    if (existing) return prisma.orgSeat.update({ where: { id: existing.id }, data: { isPrimary: true } });
    return prisma.orgSeat.create({ data: { userId, orgUnitId, seatType, isPrimary: true } });
  }

  async function budget(crewId: string, year: number, amount: number, opts: {
    status: "APPROVED" | "PENDING";
    pendingAmount?: number | null;
    requestedById?: string | null;
    approvedById?: string | null;
  }) {
    const data = {
      amount,
      currency: "CHF",
      status: opts.status,
      pendingAmount: opts.pendingAmount ?? null,
      requestedById: opts.requestedById ?? null,
      requestedAt: new Date("2026-01-15"),
      approvedById: opts.approvedById ?? null,
      approvedAt: opts.approvedById ? new Date("2026-01-20") : null,
    };
    await prisma.crewBudget.upsert({
      where: { crewId_year: { crewId, year } },
      update: data,
      create: { crewId, year, ...data },
    });
  }

  async function override(crewId: string, table: string, payload: object, status: "REQUESTED" | "APPROVED", by: string) {
    const data = {
      payload: JSON.stringify(payload),
      status,
      requestedBy: by,
      approvedBy: status === "APPROVED" ? by : null,
      approvedAt: status === "APPROVED" ? new Date("2026-02-01") : null,
    };
    await prisma.crewMappingOverride.upsert({
      where: { crewId_table: { crewId, table } },
      update: data,
      create: { crewId, table, version: 1, ...data },
    });
  }

  // App-wide admin already exists (admin@estimaite.local) — used as the top approver.
  const appAdmin = await prisma.user.findUnique({ where: { email: "admin@estimaite.local" } });

  let crewIdx = 0;
  const allCrews: { id: string; name: string; company: string }[] = [];

  for (const co of COMPANIES) {
    const company = await unit("COMPANY", co.name, null, co.currency);
    const slug = co.name.toLowerCase().replace(/[^a-z]/g, "");

    // One Org (company-level) admin per company — approver for every crew beneath it.
    const orgAdmin = await user(`${slug}.orgadmin@estimaite.local`, `${co.name} Org Admin`, "ADMINISTRATOR");
    await primarySeat(orgAdmin.id, company.id, "ORG_ADMIN");

    const companyCrews: { id: string; name: string }[] = [];
    for (const div of co.divisions) {
      const division = await unit("DIVISION", div.name, company.id);
      for (const sub of div.subs) {
        const subDivision = await unit("SUB_DIVISION", sub.name, division.id);
        for (const st of sub.streams) {
          const stream = await unit("STREAM", st.name, subDivision.id);
          for (const cr of st.crews) {
            const crew = await unit("CREW", cr.name, stream.id);
            companyCrews.push({ id: crew.id, name: cr.name });
            allCrews.push({ id: crew.id, name: cr.name, company: co.name });
            for (const podName of cr.pods) {
              const loc = LOCATIONS[crewIdx % LOCATIONS.length];
              const existingTeam = await prisma.team.findUnique({ where: { name: podName } });
              const teamData = {
                mappedLocation: loc,
                standardTeamSize: 10,
                currency: "CHF",
                teamSprintRate: 24000 + (crewIdx % 4) * 1500,
                resourceSprintRate: 2400 + (crewIdx % 4) * 150,
                costMethod: "Resource Cost per Sprint",
                locationMixJson: JSON.stringify([{ location: loc, allocationPct: 100 }]),
                active: true,
                crewId: crew.id,
              };
              if (existingTeam) {
                await prisma.teamMember.deleteMany({ where: { teamId: existingTeam.id } });
                await prisma.team.update({ where: { id: existingTeam.id }, data: {
                  ...teamData,
                  members: { create: [
                    { name: `${cr.name} Dev 1`, roleStream: "DEV", resourceLevel: LEVELS[crewIdx % 3], location: loc },
                    { name: `${cr.name} Dev 2`, roleStream: "DEV", resourceLevel: LEVELS[(crewIdx + 1) % 3], location: loc },
                    { name: `${cr.name} QA 1`, roleStream: "QA", resourceLevel: LEVELS[(crewIdx + 2) % 3], location: loc },
                  ] },
                } });
              } else {
                await prisma.team.create({ data: {
                  name: podName,
                  effectiveFrom: new Date("2026-01-01"),
                  ...teamData,
                  members: { create: [
                    { name: `${cr.name} Dev 1`, roleStream: "DEV", resourceLevel: LEVELS[crewIdx % 3], location: loc },
                    { name: `${cr.name} Dev 2`, roleStream: "DEV", resourceLevel: LEVELS[(crewIdx + 1) % 3], location: loc },
                    { name: `${cr.name} QA 1`, roleStream: "QA", resourceLevel: LEVELS[(crewIdx + 2) % 3], location: loc },
                  ] },
                } });
              }
            }
            crewIdx++;
          }
        }
      }
    }

    // Per-company RBAC personas: a Crew Tech Lead (approver) on crew[0]; a plain crew admin
    // (submitter → PENDING) on crew[1].
    const ctlCrew = companyCrews[0];
    const submitterCrew = companyCrews[1];
    const ctl = await user(`${slug}.ctl@estimaite.local`, `${ctlCrew.name} Tech Lead`, "DELIVERY_LEAD");
    await primarySeat(ctl.id, ctlCrew.id, "CREW_TECH_LEAD");
    const crewAdmin = await user(`${slug}.crewadmin@estimaite.local`, `${submitterCrew.name} Crew Admin`, "ADMINISTRATOR");
    await primarySeat(crewAdmin.id, submitterCrew.id, "ORG_ADMIN");

    // Budgets across every approval state, per crew in this company.
    for (let i = 0; i < companyCrews.length; i++) {
      const c = companyCrews[i];
      const base = 500_000 + i * 250_000;
      const mode = i % 3;
      if (mode === 0) {
        // Fully approved (both years).
        await budget(c.id, 2026, base, { status: "APPROVED", approvedById: orgAdmin.id, requestedById: orgAdmin.id });
        await budget(c.id, 2027, base + 250_000, { status: "APPROVED", approvedById: orgAdmin.id, requestedById: orgAdmin.id });
      } else if (mode === 1) {
        // 2026 approved; 2027 a brand-new PENDING request from the crew admin (awaiting approval).
        await budget(c.id, 2026, base, { status: "APPROVED", approvedById: orgAdmin.id, requestedById: orgAdmin.id });
        await budget(c.id, 2027, base + 300_000, { status: "PENDING", requestedById: crewAdmin.id });
      } else {
        // 2026 approved WITH a parked pending edit (approved amount stands until promoted); 2027 approved.
        await budget(c.id, 2026, base, { status: "APPROVED", approvedById: orgAdmin.id, requestedById: orgAdmin.id, pendingAmount: base + 150_000 });
        await budget(c.id, 2027, base + 200_000, { status: "APPROVED", approvedById: orgAdmin.id, requestedById: orgAdmin.id });
      }
    }

    // One illustrative per-crew override per company, cycling through states/domains.
    const requester = crewAdmin.id;
    if (co.name === "Citi") {
      // Pending REQUESTED issue-mapping override (awaiting admin approval).
      await override(companyCrews[0].id, "ISSUE", {
        issueMappings: DEFAULT_CONFIG.issueMappings,
        issueStoryPointMappings: DEFAULT_CONFIG.issueStoryPointMappings,
        allowedIssueStoryPoints: DEFAULT_CONFIG.allowedIssueStoryPoints,
      }, "REQUESTED", requester);
      // Approved resource-levels override (bumped capacity).
      await override(companyCrews[1].id, "RESOURCE_LEVELS", {
        resourceLevels: DEFAULT_CONFIG.resourceLevels.map((l) => ({ ...l, capacitySpPerSprint: l.capacitySpPerSprint + 2 })),
      }, "APPROVED", requester);
    } else if (co.name === "HSBC") {
      // Approved location sprint-rate override (rates +10%).
      await override(companyCrews[0].id, "LOCATION_SPRINT_RATES", {
        costMappings: DEFAULT_CONFIG.costMappings.map((c) => ({ ...c, resourceSprintCost: Math.round(c.resourceSprintCost * 1.1) })),
      }, "APPROVED", requester);
    } else if (co.name === "Barclays") {
      // Approved Tier-3 estimation-config divergence → lights up the "not comparable" flag.
      await override(companyCrews[0].id, "ESTIMATION_CONFIG", {
        complexityMultipliers: { XS: 1.0, S: 1.1, M: 1.25, L: 1.45, XL: 1.7, XXL: 2.0 },
        calibrationMinSamples: DEFAULT_CONFIG.calibrationMinSamples,
      }, "APPROVED", requester);
    }
  }

  console.log(
    `Seeded ${COMPANIES.length} companies, ${allCrews.length} crews, per-tier RBAC users, budgets ` +
      `(approved/pending-new/pending-edit) and per-crew overrides (requested/approved/tier-3).` +
      (appAdmin ? "" : " (note: app admin user not found)"),
  );
}
