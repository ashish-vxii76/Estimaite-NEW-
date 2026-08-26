import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { DEFAULT_CONFIG } from "@/domain/estimation";
import { createEstimate, calculateAndPersist } from "@/services/estimateService";

/** Real input pinning: a recompute must re-derive identically even if the team's rate/roster changes. */

afterAll(async () => {
  await prisma.$disconnect();
});

describe("real input pinning (#reproducibility)", () => {
  it("recompute uses the pinned rate even after the team's live rate changes", async () => {
    const rand = Math.random().toString(36).slice(2, 8);
    const team = await prisma.team.create({
      data: {
        name: `Pin-${rand}`,
        mappedLocation: "India",
        standardTeamSize: 10,
        currency: "CHF",
        teamSprintRate: 12000,
        resourceSprintRate: 1000,
        effectiveFrom: new Date(),
      },
    });
    const user = await prisma.user.create({
      data: { email: `pin-${rand}@int.test`, name: "pin", passwordHash: "x", role: "ESTIMATOR" },
    });
    await prisma.teamMember.create({
      data: { teamId: team.id, name: "D", roleStream: "DEV", resourceLevel: "intermediate", location: "India" },
    });
    await prisma.teamMember.create({
      data: { teamId: team.id, name: "Q", roleStream: "QA", resourceLevel: "experienced", location: "India" },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = {
      workItemType: "ISSUE",
      reference: `R-${rand}`,
      title: "Pin test",
      teamId: team.id,
      requester: "tester",
      stance: "NEUTRAL",
      planningMode: "RESOURCE_CONSTRAINED",
      costingModel: "RESOURCE_SPRINT",
      currency: "CHF",
      devResourceLevel: "intermediate",
      qaResourceLevel: "experienced",
      devAiProductivity: 0,
      qaAiProductivity: 0,
      availableDev: 1,
      availableQa: 1,
      targetSprints: 1,
      otherFixedCost: 0,
      costingBasis: "TEAM",
      complexityScores: DEFAULT_CONFIG.complexityDimensions.map((d) => ({ dimensionId: d.id, score: 4 })),
      readiness: ["business", "acceptance", "dependencies", "architecture", "test"].map((c) => ({
        criterionId: c,
        answer: "YES",
      })),
    };

    const est = await createEstimate(data, user.id);
    const r1 = await calculateAndPersist(est.id, user.id);
    const cost1 = r1!.result.aiAdjustedDeliveryCost;
    expect(cost1).toBeGreaterThan(0);

    // The team's live rate changes dramatically afterwards…
    await prisma.team.update({ where: { id: team.id }, data: { resourceSprintRate: 9999 } });

    const r2 = await calculateAndPersist(est.id, user.id);
    const cost2 = r2!.result.aiAdjustedDeliveryCost;

    // …but the recompute uses the PINNED rate, so the cost is unchanged.
    expect(cost2).toBe(cost1);
  });
});
