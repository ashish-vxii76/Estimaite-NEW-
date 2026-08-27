import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { getPortfolio } from "@/services/portfolioService";

/**
 * Budget-vs-utilisation rollup: Utilised = committed (Approved + Completed), AI-adjusted;
 * in-pipeline (Ready/Reviewed) = forecast; cost-deferred CRs excluded; Draft/Rejected never count.
 */

const YEAR = 2030;
let crewId = "";

function mkResult(ai: number | null, base: number, tshirt = "M") {
  return JSON.stringify({
    effectiveTshirt: tshirt,
    governanceDecision: "READY",
    deliveryFlag: "READY",
    selectedSp: 8,
    aiAdjustedDeliveryCost: ai,
    baselineDeliveryCost: base,
    adjustedTotalEffortPd: 10,
    currency: "CHF",
    costApplicability: ai == null ? "DEFERRED" : "OK",
  });
}

beforeAll(async () => {
  const user = await prisma.user.create({
    data: { email: "budget@int.test", name: "Budget Tester", passwordHash: "x", role: "ADMINISTRATOR" },
  });
  const crew = await prisma.orgUnit.create({ data: { type: "CREW", name: "BudgetCrew", active: true } });
  crewId = crew.id;
  const team = await prisma.team.create({
    data: {
      name: "BudgetPod",
      mappedLocation: "India",
      standardTeamSize: 10,
      currency: "CHF",
      teamSprintRate: 12000,
      resourceSprintRate: 1000,
      effectiveFrom: new Date(),
      crewId: crew.id,
    },
  });
  await prisma.crewBudget.create({ data: { crewId: crew.id, year: YEAR, amount: 100000, currency: "CHF" } });

  const base = {
    workItemType: "ISSUE",
    title: "t",
    teamId: team.id,
    requester: "r",
    configurationVersionId: "cfg",
    rateVersionId: "rate",
    createdById: user.id,
  };
  // Committed (Approved + Completed) → utilised
  await prisma.estimate.create({ data: { ...base, reference: "A1", status: "APPROVED", release: `${YEAR}-Q1`, resultJson: mkResult(10000, 12000) } });
  await prisma.estimate.create({ data: { ...base, reference: "C1", status: "COMPLETED", release: `${YEAR}-Q2`, resultJson: mkResult(20000, 22000) } });
  // In-pipeline → forecast, not utilised
  await prisma.estimate.create({ data: { ...base, reference: "R1", status: "READY_FOR_REVIEW", release: `${YEAR}-Q3`, resultJson: mkResult(5000, 6000) } });
  // Excluded: Draft + Rejected must never count
  await prisma.estimate.create({ data: { ...base, reference: "D1", status: "DRAFT", release: `${YEAR}-Q4`, resultJson: mkResult(99999, 99999) } });
  await prisma.estimate.create({ data: { ...base, reference: "X1", status: "REJECTED", release: `${YEAR}-Q1`, resultJson: mkResult(99999, 99999) } });
  // Cost-deferred committed CR (ROM Epic) → sized but no AI cost → excluded from utilised sum
  await prisma.estimate.create({ data: { ...base, reference: "E1", status: "APPROVED", release: `${YEAR}-Q1`, resultJson: mkResult(null, 0, "XXL") } });
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("budget utilisation rollup", () => {
  it("counts only committed (Approved+Completed) AI cost, excludes drafts/rejected/deferred", async () => {
    const data = await getPortfolio({ year: YEAR, crewIds: [crewId] });
    const u = data.budgetUtilisation;

    expect(u.budget).toBe(100000);
    // 10000 + 20000 (deferred null and draft/rejected excluded)
    expect(u.utilizedAiCost).toBe(30000);
    expect(u.utilizedBaselineCost).toBe(34000); // 12000 + 22000
    expect(u.committedCount).toBe(2);
    // forecast = in-pipeline only
    expect(u.forecastAiCost).toBe(5000);
    expect(u.pipelineCount).toBe(1);
    expect(u.projectedAiCost).toBe(35000);
    // derived
    expect(u.remaining).toBe(70000);
    expect(u.utilizationPct).toBeCloseTo(0.3, 5);
    expect(u.utilizedRag).toBe("GREEN");
  });

  it("goes RED when committed spend exceeds 110% of budget", async () => {
    // Lower the budget below committed*(1/1.1): committed 30000 → budget 20000 → 150% → RED
    await prisma.crewBudget.updateMany({ where: { crewId, year: YEAR }, data: { amount: 20000 } });
    const data = await getPortfolio({ year: YEAR, crewIds: [crewId] });
    expect(data.budgetUtilisation.utilizedRag).toBe("RED");
    expect(data.budgetUtilisation.remaining).toBe(-10000);
  });
});
