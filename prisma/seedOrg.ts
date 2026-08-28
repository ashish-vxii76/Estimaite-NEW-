import type { PrismaClient } from "@prisma/client";

/** Seed UBS → GCORC → Compliance & Risk → IBRL stream → IBRL crew → pods. */
export async function seedOrgHierarchy(prisma: PrismaClient) {
  async function upsertUnit(
    type: string,
    name: string,
    parentId: string | null,
  ) {
    const existing = await prisma.orgUnit.findFirst({
      where: { type, name, parentId: parentId ?? null },
    });
    if (existing) {
      return prisma.orgUnit.update({
        where: { id: existing.id },
        data: { active: true, parentId },
      });
    }
    return prisma.orgUnit.create({
      data: { type, name, parentId, active: true },
    });
  }

  const company = await upsertUnit("COMPANY", "UBS", null);
  const division = await upsertUnit("DIVISION", "GCORC", company.id);
  const sub = await upsertUnit("SUB_DIVISION", "GCORC - Compliance & Risk", division.id);
  const stream = await upsertUnit("STREAM", "IBRL and Employee Conduct", sub.id);
  const crew = await upsertUnit("CREW", "IBRL", stream.id);

  const teams = await prisma.team.findMany();
  for (const team of teams) {
    await prisma.team.update({ where: { id: team.id }, data: { crewId: crew.id } });
  }

  const year = new Date().getFullYear();
  const existingBudget = await prisma.crewBudget.findUnique({
    where: { crewId_year: { crewId: crew.id, year } },
  });
  if (!existingBudget) {
    await prisma.crewBudget.create({
      data: { crewId: crew.id, year, amount: 500000, currency: "CHF" },
    });
  }

  const admin = await prisma.user.findUnique({ where: { email: "admin@estimaite.local" } });
  if (admin) {
    await prisma.orgSeat.deleteMany({ where: { userId: admin.id } });
    await prisma.orgSeat.create({
      data: {
        userId: admin.id,
        orgUnitId: company.id,
        seatType: "ORG_ADMIN",
        isPrimary: true,
      },
    });
  }

  // Casey Delivery Lead is a Pod-level user (team Centurions) — no org seat.
  const delivery = await prisma.user.findUnique({ where: { email: "delivery@estimaite.local" } });
  if (delivery) {
    await prisma.orgSeat.deleteMany({ where: { userId: delivery.id } });
  }

  const finance = await prisma.user.findUnique({ where: { email: "finance@estimaite.local" } });
  if (finance) {
    await prisma.orgSeat.deleteMany({ where: { userId: finance.id } });
    await prisma.orgSeat.create({
      data: {
        userId: finance.id,
        orgUnitId: division.id,
        seatType: "ORG_ADMIN",
        isPrimary: true,
      },
    });
  }

  const eng = await prisma.user.findUnique({ where: { email: "eng@estimaite.local" } });
  if (eng) {
    await prisma.orgSeat.deleteMany({ where: { userId: eng.id } });
    await prisma.orgSeat.create({
      data: {
        userId: eng.id,
        orgUnitId: crew.id,
        seatType: "CREW_TECH_LEAD",
        isPrimary: true,
      },
    });
  }

  // Multi-role demo grants: users who hold more than one role and can switch between
  // them (login sets the primary). Scope is a pod (teamId) or an org unit (orgUnitId).
  const centurions = await prisma.team.findFirst({ where: { name: "Centurions" } });
  const vikings = await prisma.team.findFirst({ where: { name: "Vikings" } });
  if (delivery && centurions) {
    await prisma.roleGrant.deleteMany({ where: { userId: delivery.id } });
    await prisma.roleGrant.createMany({
      data: [
        { userId: delivery.id, role: "DELIVERY_LEAD", label: "Delivery Lead", teamId: centurions.id, isPrimary: true },
        { userId: delivery.id, role: "DELIVERY_LEAD", label: "Deputy Crew Tech Lead", orgUnitId: crew.id, isPrimary: false },
      ],
    });
  }
  if (eng && vikings) {
    await prisma.roleGrant.deleteMany({ where: { userId: eng.id } });
    await prisma.roleGrant.createMany({
      data: [
        { userId: eng.id, role: "ESTIMATOR", label: "Crew Tech Lead", orgUnitId: crew.id, isPrimary: true },
        { userId: eng.id, role: "ESTIMATOR", label: "Estimator", teamId: vikings.id, isPrimary: false },
      ],
    });
  }

  // Backfill org path snapshots on estimates missing them
  const estimates = await prisma.estimate.findMany({
    select: { id: true, teamId: true, orgPathJson: true },
  });
  for (const est of estimates) {
    if (est.orgPathJson && est.orgPathJson.trim()) continue;
    const team = await prisma.team.findUnique({
      where: { id: est.teamId },
      include: { crew: true },
    });
    if (!team?.crew) continue;
    const stream = team.crew.parentId
      ? await prisma.orgUnit.findUnique({ where: { id: team.crew.parentId } })
      : null;
    const sub = stream?.parentId
      ? await prisma.orgUnit.findUnique({ where: { id: stream.parentId } })
      : null;
    const division = sub?.parentId
      ? await prisma.orgUnit.findUnique({ where: { id: sub.parentId } })
      : null;
    const company = division?.parentId
      ? await prisma.orgUnit.findUnique({ where: { id: division.parentId } })
      : null;
    if (!company || !division || !sub || !stream) continue;
    await prisma.estimate.update({
      where: { id: est.id },
      data: {
        orgPathJson: JSON.stringify({
          companyId: company.id,
          companyName: company.name,
          divisionId: division.id,
          divisionName: division.name,
          subDivisionId: sub.id,
          subDivisionName: sub.name,
          streamId: stream.id,
          streamName: stream.name,
          crewId: team.crew.id,
          crewName: team.crew.name,
          teamId: team.id,
          teamName: team.name,
        }),
      },
    });
  }

  return { company, division, sub, stream, crew };
}
