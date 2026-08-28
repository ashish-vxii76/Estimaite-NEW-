import type { PrismaClient } from "@prisma/client";
import {
  calculateEstimate,
  calculateVariance,
  DEFAULT_CONFIG,
  DEFAULT_READINESS_CRITERIA,
  type EstimateCalculationInput,
  type EstimateCalculationResult,
  type ReadinessAnswer,
} from "../src/domain/estimation";

export const DEMO_PROJECT = "Estimaite Demo Register";

type DemoStatus =
  | "DRAFT"
  | "RETURNED"
  | "READY_FOR_REVIEW"
  | "REVIEWED"
  | "APPROVED"
  | "REJECTED"
  | "COMPLETED";

type DemoSpec = {
  reference: string;
  title: string;
  description: string;
  team: string;
  type: "ISSUE" | "EPIC";
  status: DemoStatus;
  requester: string;
  jiraId: string;
  programme: string;
  release: string;
  stance: "OPTIMISTIC" | "NEUTRAL" | "PESSIMISTIC";
  scores: number | Record<string, number>;
  readinessYes: number;
  calculate: boolean;
  aiPct?: number;
  availableDev?: number;
  availableQa?: number;
  otherFixedCost?: number;
  overrideSp?: number;
  actualRatio?: number;
};

function scoresFrom(spec: number | Record<string, number>) {
  if (typeof spec === "number") {
    return DEFAULT_CONFIG.complexityDimensions.map((d) => ({
      dimensionId: d.id,
      score: spec,
    }));
  }
  return DEFAULT_CONFIG.complexityDimensions.map((d) => ({
    dimensionId: d.id,
    score: spec[d.id] ?? 3,
  }));
}

function readinessFrom(yesCount: number) {
  return DEFAULT_READINESS_CRITERIA.map((c, index) => ({
    criterionId: c.id,
    answer: (index < yesCount ? "YES" : "NO") as ReadinessAnswer,
  }));
}

const DEMOS: DemoSpec[] = [
  {
    reference: "CR-26101",
    title: "Customer KYC document upload",
    description: "Allow retail customers to upload identity documents in the mobile app.",
    team: "Vikings",
    type: "ISSUE",
    status: "COMPLETED",
    requester: "Alex Requester",
    jiraId: "BANK-4101",
    programme: "Digital Onboarding",
    release: "2026-Q2",
    stance: "NEUTRAL",
    scores: 2,
    readinessYes: 5,
    calculate: true,
    aiPct: 0.15,
    actualRatio: 0.92,
  },
  {
    reference: "CR-26102",
    title: "Payment limit self-service change",
    description: "Customers raise daily payment limits with dual approval.",
    team: "Vikings",
    type: "ISSUE",
    status: "COMPLETED",
    requester: "Alex Requester",
    jiraId: "BANK-4102",
    programme: "Payments",
    release: "2026-Q2",
    stance: "NEUTRAL",
    scores: 3,
    readinessYes: 5,
    calculate: true,
    actualRatio: 1.08,
  },
  {
    reference: "CR-26103",
    title: "Standing order skip next occurrence",
    description: "Skip a single standing-order payment without cancelling the series.",
    team: "Spartans",
    type: "ISSUE",
    status: "COMPLETED",
    requester: "Alex Requester",
    jiraId: "BANK-4103",
    programme: "Payments",
    release: "2026-Q1",
    stance: "OPTIMISTIC",
    scores: 2,
    readinessYes: 5,
    calculate: true,
    actualRatio: 1.15,
  },
  {
    reference: "CR-26104",
    title: "Card freeze from internet banking",
    description: "Temporary freeze/unfreeze of debit cards.",
    team: "Centurions",
    type: "ISSUE",
    status: "COMPLETED",
    requester: "Alex Requester",
    jiraId: "BANK-4104",
    programme: "Cards",
    release: "2026-Q1",
    stance: "NEUTRAL",
    scores: 3,
    readinessYes: 5,
    calculate: true,
    aiPct: 0.2,
    actualRatio: 0.88,
  },
  {
    reference: "CR-26105",
    title: "Statement PDF archive search",
    description: "Search and download 7 years of statements.",
    team: "Praetorians",
    type: "ISSUE",
    status: "COMPLETED",
    requester: "Alex Requester",
    jiraId: "BANK-4105",
    programme: "Servicing",
    release: "2026-Q1",
    stance: "NEUTRAL",
    scores: 4,
    readinessYes: 4,
    calculate: true,
    availableDev: 2,
    availableQa: 1,
    actualRatio: 1.22,
  },
  {
    reference: "CR-26106",
    title: "Push notification preference centre",
    description: "Channel-level consent for marketing and service alerts.",
    team: "Vikings",
    type: "ISSUE",
    status: "COMPLETED",
    requester: "Alex Requester",
    jiraId: "BANK-4106",
    programme: "Engagement",
    release: "2025-Q4",
    stance: "NEUTRAL",
    scores: 2,
    readinessYes: 5,
    calculate: true,
    actualRatio: 1.04,
  },
  {
    reference: "CR-26107",
    title: "Open banking account aggregation",
    description: "Display linked external accounts on the home dashboard.",
    team: "Centurions",
    type: "ISSUE",
    status: "COMPLETED",
    requester: "Alex Requester",
    jiraId: "BANK-4107",
    programme: "Open Banking",
    release: "2025-Q4",
    stance: "PESSIMISTIC",
    scores: 4,
    readinessYes: 5,
    calculate: true,
    availableDev: 2,
    availableQa: 2,
    actualRatio: 0.97,
  },
  {
    reference: "CR-26110",
    title: "Mortgage affordability calculator refresh",
    description: "Replace the legacy calculator with governed rates and stress tests.",
    team: "Praetorians",
    type: "ISSUE",
    status: "APPROVED",
    requester: "Alex Requester",
    jiraId: "BANK-4110",
    programme: "Lending",
    release: "2026-Q3",
    stance: "NEUTRAL",
    scores: 3,
    readinessYes: 5,
    calculate: true,
    otherFixedCost: 2500,
  },
  {
    reference: "CR-26111",
    title: "FX weekend rate lock",
    description: "Allow weekend quote lock with Monday settlement.",
    team: "Spartans",
    type: "ISSUE",
    status: "APPROVED",
    requester: "Alex Requester",
    jiraId: "BANK-4111",
    programme: "Treasury",
    release: "2026-Q3",
    stance: "NEUTRAL",
    scores: 3,
    readinessYes: 5,
    calculate: true,
    overrideSp: 8,
  },
  {
    reference: "CR-26120",
    title: "Sanctions screening rule pack Q3",
    description: "New list sources and false-positive workflow.",
    team: "Centurions",
    type: "ISSUE",
    status: "REVIEWED",
    requester: "Alex Requester",
    jiraId: "BANK-4120",
    programme: "Financial Crime",
    release: "2026-Q3",
    stance: "NEUTRAL",
    scores: 4,
    readinessYes: 5,
    calculate: true,
  },
  {
    reference: "CR-26121",
    title: "Branch appointment booking",
    description: "Book a relationship-manager slot from the app.",
    team: "Vikings",
    type: "ISSUE",
    status: "READY_FOR_REVIEW",
    requester: "Alex Requester",
    jiraId: "BANK-4121",
    programme: "Branch Experience",
    release: "2026-Q3",
    stance: "NEUTRAL",
    scores: 2,
    readinessYes: 5,
    calculate: true,
  },
  {
    reference: "CR-26122",
    title: "Core payments ISO 20022 enrichment",
    description: "Enrich outbound pacs.008 with structured remittance.",
    team: "Praetorians",
    type: "ISSUE",
    status: "READY_FOR_REVIEW",
    requester: "Alex Requester",
    jiraId: "BANK-4122",
    programme: "Payments",
    release: "2026-Q4",
    stance: "NEUTRAL",
    scores: 5,
    readinessYes: 5,
    calculate: true,
    availableDev: 2,
    availableQa: 2,
  },
  {
    reference: "CR-26130",
    title: "Wealth portfolio rebalance engine",
    description: "ROM for a new rebalance service across custody and advice.",
    team: "Praetorians",
    type: "EPIC",
    status: "APPROVED",
    requester: "Alex Requester",
    jiraId: "BANK-4130",
    programme: "Wealth",
    release: "2026-Q4",
    stance: "NEUTRAL",
    scores: 4,
    readinessYes: 4,
    calculate: true,
  },
  {
    reference: "CR-26131",
    title: "SME lending origination rebuild",
    description: "Replace the SME credit journey. Cost deferred to child stories.",
    team: "Centurions",
    type: "EPIC",
    status: "READY_FOR_REVIEW",
    requester: "Alex Requester",
    jiraId: "BANK-4131",
    programme: "Lending",
    release: "2027-Q1",
    stance: "NEUTRAL",
    scores: 5,
    readinessYes: 3,
    calculate: true,
  },
  {
    reference: "CR-26140",
    title: "Chatbot intent for card disputes",
    description: "Discovery spike — acceptance criteria not agreed.",
    team: "Spartans",
    type: "ISSUE",
    status: "DRAFT",
    requester: "Alex Requester",
    jiraId: "BANK-4140",
    programme: "Servicing",
    release: "2026-Q4",
    stance: "NEUTRAL",
    scores: 3,
    readinessYes: 2,
    calculate: true,
  },
  {
    reference: "CR-26141",
    title: "ATM locator accessibility pass",
    description: "Returned for missing NFR evidence.",
    team: "Vikings",
    type: "ISSUE",
    status: "RETURNED",
    requester: "Alex Requester",
    jiraId: "BANK-4141",
    programme: "Channels",
    release: "2026-Q3",
    stance: "NEUTRAL",
    scores: 2,
    readinessYes: 3,
    calculate: true,
  },
  {
    reference: "CR-26142",
    title: "Crypto buy/sell in app",
    description: "Rejected — out of risk appetite for 2026.",
    team: "Spartans",
    type: "ISSUE",
    status: "REJECTED",
    requester: "Alex Requester",
    jiraId: "BANK-4142",
    programme: "Wealth",
    release: "2027-Q1",
    stance: "NEUTRAL",
    scores: 4,
    readinessYes: 4,
    calculate: true,
  },
  {
    reference: "CR-26150",
    title: "Loyalty points expiry reminder",
    description: "Draft inputs only — not yet calculated.",
    team: "Vikings",
    type: "ISSUE",
    status: "DRAFT",
    requester: "Alex Requester",
    jiraId: "BANK-4150",
    programme: "Engagement",
    release: "2026-Q4",
    stance: "NEUTRAL",
    scores: 2,
    readinessYes: 4,
    calculate: false,
  },
];

function mixJson(location: { id: string; name: string; dailyRate: number; currency: string }, isEpic: boolean) {
  return JSON.stringify([
    {
      locationId: location.id,
      locationName: location.name,
      allocationPct: 100,
      dailyRate: location.dailyRate,
      currency: location.currency,
      costingBasis: isEpic ? "" : "TEAM",
      costMethod: isEpic ? "" : "Resource Cost per Sprint",
      projectOverrideRate: null,
    },
  ]);
}

function engineInput(
  spec: DemoSpec,
  team: {
    id: string;
    name: string;
    mappedLocation: string;
    currency: string;
    resourceSprintRate: number;
    teamSprintRate: number;
    standardTeamSize: number;
    locationMixJson: string;
    members: { name: string; roleStream: string; resourceLevel: string; location: string }[];
  },
  locations: { name: string; dailyRate: number; currency: string }[],
): EstimateCalculationInput {
  const teamMix = JSON.parse(team.locationMixJson || "[]") as {
    location: string;
    allocationPct: number;
  }[];
  const locationAllocations = teamMix.map((row) => {
    const rate = locations.find((l) => l.name === row.location);
    return {
      locationId: row.location,
      locationName: row.location,
      allocationPct: row.allocationPct,
      dailyRate: rate?.dailyRate ?? 0,
      currency: rate?.currency ?? team.currency,
    };
  });
  const teamCost = DEFAULT_CONFIG.teamCostMappings.find((t) => t.teamName === team.name);
  return {
    workItemType: spec.type,
    complexityScores: scoresFrom(spec.scores),
    readiness: readinessFrom(spec.readinessYes),
    stance: spec.stance,
    overrideEnabled: spec.overrideSp != null,
    overrideSp: spec.overrideSp ?? null,
    costingBasis: spec.type === "EPIC" ? "" : "TEAM",
    teamId: team.id,
    teamName: team.name,
    locationName: team.mappedLocation,
    costMethod: spec.type === "EPIC" ? "" : "Resource Cost per Sprint",
    devResourceLevelId: spec.team === "Praetorians" || spec.team === "Centurions" ? "experienced" : "intermediate",
    qaResourceLevelId: "experienced",
    devAiProductivityPct: spec.aiPct ?? 0,
    qaAiProductivityPct: spec.aiPct ?? 0,
    planningMode: "RESOURCE_CONSTRAINED",
    availableDev: spec.availableDev ?? 1,
    availableQa: spec.availableQa ?? 1,
    targetSprints: 2,
    costingModel: "RESOURCE_SPRINT",
    resourceSprintRate: teamCost?.resourceSprintCost ?? team.resourceSprintRate,
    teamSprintRate: teamCost?.teamSprintCost ?? team.teamSprintRate,
    otherFixedCost: spec.type === "EPIC" ? 0 : spec.otherFixedCost ?? 0,
    locationAllocations,
    roster: team.members.map((m) => ({
      name: m.name,
      roleStream: m.roleStream,
      location: m.location,
      seniority: m.resourceLevel,
      headcount: 1,
    })),
    currency: teamCost?.currency ?? team.currency,
    standardTeamSize: teamCost?.standardTeamSize ?? team.standardTeamSize,
  };
}

export async function seedDemoRegister(prisma: PrismaClient) {
  const existing = await prisma.estimate.findMany({
    where: { project: DEMO_PROJECT },
    select: { id: true },
  });
  const ids = existing.map((row) => row.id);
  if (ids.length) {
    await prisma.auditEvent.deleteMany({ where: { estimateId: { in: ids } } });
    await prisma.estimate.deleteMany({ where: { id: { in: ids } } });
  }

  const admin = await prisma.user.findUnique({ where: { email: "admin@estimaite.local" } });
  const estimator = await prisma.user.findUnique({ where: { email: "eng@estimaite.local" } });
  const reviewer = await prisma.user.findUnique({ where: { email: "reviewer@estimaite.local" } });
  const approver = await prisma.user.findUnique({ where: { email: "approver@estimaite.local" } });
  if (!admin || !estimator) throw new Error("Seed users before demo estimates");

  const teams = await prisma.team.findMany({ include: { members: true } });
  const locations = await prisma.location.findMany();
  const teamByName = Object.fromEntries(teams.map((t) => [t.name, t]));
  const locByName = Object.fromEntries(locations.map((l) => [l.name, l]));

  let totalAi = 0;

  for (const [index, spec] of DEMOS.entries()) {
    const team = teamByName[spec.team];
    if (!team) throw new Error(`Missing team ${spec.team}`);
    const loc = locByName[team.mappedLocation] ?? locations[0];
    // Spread creation across ~5 months so Home sparklines / activity trend show real movement.
    const createdAt = new Date(Date.UTC(2026, 2, 4 + index * 8, 9, 0, 0));
    const input = engineInput(spec, team, locations);
    let result: EstimateCalculationResult | null = null;
    if (spec.calculate) {
      result = calculateEstimate(input, DEFAULT_CONFIG);
      if (result.aiAdjustedDeliveryCost) totalAi += result.aiAdjustedDeliveryCost;
    }

    const estimate = await prisma.estimate.create({
      data: {
        workItemType: spec.type,
        reference: spec.reference,
        title: spec.title,
        description: spec.description,
        teamId: team.id,
        status: spec.status === "COMPLETED" ? "APPROVED" : spec.status,
        requester: spec.requester,
        jiraId: spec.jiraId,
        project: DEMO_PROJECT,
        programme: spec.programme,
        release: spec.release,
        stance: spec.stance,
        currency: team.currency,
        devResourceLevel: input.devResourceLevelId,
        qaResourceLevel: input.qaResourceLevelId,
        devAiProductivity: input.devAiProductivityPct,
        qaAiProductivity: input.qaAiProductivityPct,
        availableDev: input.availableDev,
        availableQa: input.availableQa,
        targetSprints: input.targetSprints,
        otherFixedCost: input.otherFixedCost,
        overrideEnabled: spec.overrideSp != null,
        overrideSp: spec.overrideSp ?? null,
        overrideReason: spec.overrideSp != null ? "Align to delivery commitment for R26.3" : null,
        overrideRequestedBy: spec.overrideSp != null ? estimator.email : null,
        complexityScoresJson: JSON.stringify(input.complexityScores),
        readinessJson: JSON.stringify(input.readiness),
        locationMixJson: mixJson(loc, spec.type === "EPIC"),
        resultJson: result ? JSON.stringify(result) : null,
        effectiveTshirt: result?.effectiveTshirt ?? "",
        deliveryFlag: result?.deliveryFlag ?? result?.governanceDecision ?? "",
        confidence: result?.confidence ?? "",
        readinessScore: result?.readinessScore ?? 0,
        configurationVersionId: DEFAULT_CONFIG.versionId,
        rateVersionId: DEFAULT_CONFIG.rateVersionId,
        createdById: estimator.id,
        createdAt,
        updatedAt: createdAt,
      },
    });

    await prisma.auditEvent.create({
      data: {
        estimateId: estimate.id,
        userId: estimator.id,
        action: "ESTIMATE_CREATED",
        newValue: spec.reference,
        createdAt,
      },
    });
    if (result) {
      await prisma.estimateVersion.create({
        data: {
          estimateId: estimate.id,
          snapshot: JSON.stringify({ estimate, result }),
          createdAt,
        },
      });
      await prisma.auditEvent.create({
        data: {
          estimateId: estimate.id,
          userId: estimator.id,
          action: "ESTIMATE_CALCULATED",
          newValue: result.governanceDecision,
          createdAt: new Date(createdAt.getTime() + 3600_000),
        },
      });
    }

    const workflow: { action: string; to: string; email: string; userId: string }[] = [];
    if (["READY_FOR_REVIEW", "REVIEWED", "APPROVED", "REJECTED", "RETURNED", "COMPLETED"].includes(spec.status)) {
      workflow.push({
        action: "submit",
        to: "READY_FOR_REVIEW",
        email: estimator.email,
        userId: estimator.id,
      });
    }
    if (["REVIEWED", "APPROVED", "COMPLETED"].includes(spec.status)) {
      workflow.push({
        action: "review",
        to: "REVIEWED",
        email: reviewer?.email ?? admin.email,
        userId: reviewer?.id ?? admin.id,
      });
    }
    if (["APPROVED", "COMPLETED"].includes(spec.status)) {
      workflow.push({
        action: "approve",
        to: "APPROVED",
        email: approver?.email ?? admin.email,
        userId: approver?.id ?? admin.id,
      });
    }
    if (spec.status === "REJECTED") {
      workflow.push({
        action: "reject",
        to: "REJECTED",
        email: approver?.email ?? admin.email,
        userId: approver?.id ?? admin.id,
      });
    }
    if (spec.status === "RETURNED") {
      workflow.push({
        action: "return",
        to: "RETURNED",
        email: reviewer?.email ?? admin.email,
        userId: reviewer?.id ?? admin.id,
      });
    }
    for (const [step, item] of workflow.entries()) {
      await prisma.approval.create({
        data: {
          estimateId: estimate.id,
          action: item.action,
          comment: `${item.action} on demo CR`,
          actorEmail: item.email,
          createdAt: new Date(createdAt.getTime() + (step + 2) * 3600_000),
        },
      });
      await prisma.auditEvent.create({
        data: {
          estimateId: estimate.id,
          userId: item.userId,
          action: `ESTIMATE_${item.action.toUpperCase()}`,
          newValue: item.to,
          createdAt: new Date(createdAt.getTime() + (step + 2) * 3600_000),
        },
      });
    }

    if (spec.status === "COMPLETED" && result && spec.actualRatio) {
      const payload = {
        actualDevPd: Number((result.adjustedDevEffortPd * spec.actualRatio).toFixed(2)),
        actualQaPd: Number((result.adjustedQaEffortPd * spec.actualRatio).toFixed(2)),
        actualSprints: Number((result.finalSprints * Math.min(spec.actualRatio, 1.3)).toFixed(2)),
        actualDevResources: spec.availableDev ?? 1,
        actualQaResources: spec.availableQa ?? 1,
        actualOtherCost: 0,
      };
      const variance = calculateVariance({
        ...payload,
        actualCost: (result.aiAdjustedDeliveryCost ?? 0) + payload.actualOtherCost,
        estimatedDevPd: result.adjustedDevEffortPd,
        estimatedQaPd: result.adjustedQaEffortPd,
        estimatedSprints: result.finalSprints,
        estimatedCost: result.aiAdjustedDeliveryCost ?? 0,
      });
      await prisma.actualDelivery.create({
        data: {
          estimateId: estimate.id,
          ...payload,
          completionDate: new Date(createdAt.getTime() + 21 * 86400_000),
          // DEC-007 A4: authored demo finalisation instant (seed is the system-of-record for the
          // fictional timeline). Kept recent so seeded actuals fall inside the trailing window.
          finalisedAt: new Date(createdAt.getTime() + 21 * 86400_000),
          varianceJson: JSON.stringify(variance),
        },
      });
      await prisma.estimate.update({
        where: { id: estimate.id },
        data: { status: "COMPLETED" },
      });
      await prisma.auditEvent.create({
        data: {
          estimateId: estimate.id,
          userId: estimator.id,
          action: "ACTUALS_ENTERED",
          newValue: variance.interpretation,
        },
      });
    }
  }

  const budget = Math.round(totalAi * 1.12 / 1000) * 1000;
  await prisma.portfolioSettings.upsert({
    where: { id: "default" },
    update: { budget, currency: "CHF" },
    create: { id: "default", budget, currency: "CHF" },
  });

  console.log(`Seeded ${DEMOS.length} demo estimates. Portfolio budget CHF ${budget}.`);
}
