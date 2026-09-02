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

// ~10 CRs per crew across the full lifecycle, calculated through the real engine so Portfolio /
// Calibration / Analytics have data. Golden-independent (DB rows, not golden fixtures). Idempotent:
// everything is tagged with CR_PROJECT and wiped + re-created on each run.

export const CR_PROJECT = "Estimaite Crew CRs";

type Status = "DRAFT" | "READY_FOR_REVIEW" | "REVIEWED" | "APPROVED" | "REJECTED" | "RETURNED" | "COMPLETED";

// A 10-CR spread per crew, touching every stage (2 completed carry actuals).
const PLAN: { status: Status; type: "ISSUE" | "EPIC"; scores: number; stance: "OPTIMISTIC" | "NEUTRAL" | "PESSIMISTIC"; calculate: boolean; readinessYes: number; actualRatio?: number }[] = [
  { status: "COMPLETED", type: "ISSUE", scores: 2, stance: "NEUTRAL", calculate: true, readinessYes: 5, actualRatio: 1.05 },
  { status: "COMPLETED", type: "EPIC", scores: 3, stance: "NEUTRAL", calculate: true, readinessYes: 5, actualRatio: 0.92 },
  { status: "APPROVED", type: "ISSUE", scores: 3, stance: "PESSIMISTIC", calculate: true, readinessYes: 4 },
  { status: "APPROVED", type: "ISSUE", scores: 1, stance: "OPTIMISTIC", calculate: true, readinessYes: 5 },
  { status: "REVIEWED", type: "EPIC", scores: 4, stance: "NEUTRAL", calculate: true, readinessYes: 4 },
  { status: "READY_FOR_REVIEW", type: "ISSUE", scores: 2, stance: "NEUTRAL", calculate: true, readinessYes: 3 },
  { status: "READY_FOR_REVIEW", type: "ISSUE", scores: 3, stance: "PESSIMISTIC", calculate: true, readinessYes: 4 },
  { status: "RETURNED", type: "ISSUE", scores: 4, stance: "NEUTRAL", calculate: true, readinessYes: 2 },
  { status: "REJECTED", type: "ISSUE", scores: 4, stance: "PESSIMISTIC", calculate: true, readinessYes: 3 },
  { status: "DRAFT", type: "ISSUE", scores: 2, stance: "NEUTRAL", calculate: false, readinessYes: 3 },
];

const TITLES = [
  "Payments latency reduction", "KYC document upload", "Fraud alert triage", "Statement PDF redesign",
  "Card controls in app", "Onboarding flow revamp", "Dispute resolution portal", "Rewards ledger migration",
  "Open banking consent", "Notifications preference centre",
];

function scoresFrom(n: number) {
  return DEFAULT_CONFIG.complexityDimensions.map((d) => ({ dimensionId: d.id, score: n }));
}
function readinessFrom(yesCount: number) {
  return DEFAULT_READINESS_CRITERIA.map((c, i) => ({ criterionId: c.id, answer: (i < yesCount ? "YES" : "NO") as ReadinessAnswer }));
}
function mixJson(loc: { id: string; name: string; dailyRate: number; currency: string }, isEpic: boolean) {
  return JSON.stringify([{ locationId: loc.id, locationName: loc.name, allocationPct: 100, dailyRate: loc.dailyRate, currency: loc.currency, costingBasis: isEpic ? "" : "TEAM", costMethod: isEpic ? "" : "Resource Cost per Sprint", projectOverrideRate: null }]);
}

type TeamRow = {
  id: string; name: string; mappedLocation: string; currency: string; resourceSprintRate: number; teamSprintRate: number;
  standardTeamSize: number; locationMixJson: string; crewId: string | null;
  members: { name: string; roleStream: string; resourceLevel: string; location: string }[];
};

function engineInput(spec: (typeof PLAN)[number], team: TeamRow, locations: { name: string; dailyRate: number; currency: string }[]): EstimateCalculationInput {
  const teamMix = JSON.parse(team.locationMixJson || "[]") as { location: string; allocationPct: number }[];
  const locationAllocations = teamMix.map((row) => {
    const rate = locations.find((l) => l.name === row.location);
    return { locationId: row.location, locationName: row.location, allocationPct: row.allocationPct, dailyRate: rate?.dailyRate ?? 0, currency: rate?.currency ?? team.currency };
  });
  const isEpic = spec.type === "EPIC";
  return {
    workItemType: spec.type,
    complexityScores: scoresFrom(spec.scores),
    readiness: readinessFrom(spec.readinessYes),
    stance: spec.stance,
    overrideEnabled: false,
    overrideSp: null,
    costingBasis: isEpic ? "" : "TEAM",
    teamId: team.id,
    teamName: team.name,
    locationName: team.mappedLocation,
    costMethod: isEpic ? "" : "Resource Cost per Sprint",
    devResourceLevelId: "intermediate",
    qaResourceLevelId: "senior",
    devAiProductivityPct: 0,
    qaAiProductivityPct: 0,
    planningMode: "RESOURCE_CONSTRAINED",
    availableDev: 2,
    availableQa: 1,
    targetSprints: 2,
    costingModel: "RESOURCE_SPRINT",
    resourceSprintRate: team.resourceSprintRate,
    teamSprintRate: team.teamSprintRate,
    otherFixedCost: 0,
    locationAllocations,
    roster: team.members.map((m) => ({ name: m.name, roleStream: m.roleStream, location: m.location, seniority: m.resourceLevel, headcount: 1 })),
    currency: team.currency,
    standardTeamSize: team.standardTeamSize,
  };
}

export async function seedCrs(prisma: PrismaClient) {
  // Idempotent wipe of previously seeded CRs (+ their dependent rows).
  const existing = await prisma.estimate.findMany({ where: { project: CR_PROJECT }, select: { id: true } });
  const ids = existing.map((e) => e.id);
  if (ids.length) {
    await prisma.auditEvent.deleteMany({ where: { estimateId: { in: ids } } });
    await prisma.approval.deleteMany({ where: { estimateId: { in: ids } } });
    await prisma.actualDelivery.deleteMany({ where: { estimateId: { in: ids } } });
    await prisma.estimateVersion.deleteMany({ where: { estimateId: { in: ids } } });
    await prisma.estimateBaseline.deleteMany({ where: { estimateId: { in: ids } } });
    await prisma.estimate.deleteMany({ where: { id: { in: ids } } });
  }

  const estimator = await prisma.user.findUnique({ where: { email: "eng@estimaite.local" } });
  const reviewer = await prisma.user.findUnique({ where: { email: "reviewer@estimaite.local" } });
  const approver = await prisma.user.findUnique({ where: { email: "approver@estimaite.local" } });
  const admin = await prisma.user.findUnique({ where: { email: "admin@estimaite.local" } });
  if (!estimator || !admin) throw new Error("Seed base users before CRs");

  const locations = await prisma.location.findMany();
  // One team per crew (the crew's pod); crews without a pod are skipped.
  const teams = (await prisma.team.findMany({ where: { active: true, crewId: { not: null } }, include: { members: true, crew: true } })) as unknown as (TeamRow & { crew: { name: string } })[];

  let crewSeq = 0;
  let created = 0;
  for (const team of teams) {
    const loc = locations.find((l) => l.name === team.mappedLocation) ?? locations[0];
    for (const [i, spec] of PLAN.entries()) {
      const ref = `CR-${900000 + crewSeq * 100 + i}`;
      const createdAt = new Date(Date.UTC(2026, 1, 3 + ((crewSeq * 10 + i) % 150), 9, 0, 0));
      const input = engineInput(spec, team, locations);
      const result: EstimateCalculationResult | null = spec.calculate ? calculateEstimate(input, DEFAULT_CONFIG) : null;

      const estimate = await prisma.estimate.create({
        data: {
          workItemType: spec.type,
          reference: ref,
          title: `${team.crew.name}: ${TITLES[i % TITLES.length]}`,
          description: `${spec.status} demo CR for ${team.crew.name}.`,
          teamId: team.id,
          status: spec.status === "COMPLETED" ? "APPROVED" : spec.status,
          requester: "Alex Requester",
          jiraId: `DEMO-${crewSeq}${i}`,
          project: CR_PROJECT,
          programme: "Demo Programme",
          release: i % 2 === 0 ? "2026-Q3" : "2027-Q1",
          stance: spec.stance,
          currency: team.currency,
          devResourceLevel: input.devResourceLevelId,
          qaResourceLevel: input.qaResourceLevelId,
          devAiProductivity: 0,
          qaAiProductivity: 0,
          availableDev: input.availableDev,
          availableQa: input.availableQa,
          targetSprints: input.targetSprints,
          otherFixedCost: 0,
          overrideEnabled: false,
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
      created++;

      await prisma.auditEvent.create({ data: { estimateId: estimate.id, userId: estimator.id, action: "ESTIMATE_CREATED", newValue: ref, createdAt } });
      if (result) {
        await prisma.estimateVersion.create({ data: { estimateId: estimate.id, snapshot: JSON.stringify({ estimate, result }), createdAt } });
      }

      const workflow: { action: string; to: string; userId: string; email: string }[] = [];
      if (["READY_FOR_REVIEW", "REVIEWED", "APPROVED", "REJECTED", "RETURNED", "COMPLETED"].includes(spec.status)) {
        workflow.push({ action: "submit", to: "READY_FOR_REVIEW", userId: estimator.id, email: estimator.email });
      }
      if (["REVIEWED", "APPROVED", "COMPLETED"].includes(spec.status)) {
        workflow.push({ action: "review", to: "REVIEWED", userId: reviewer?.id ?? admin.id, email: reviewer?.email ?? admin.email });
      }
      if (["APPROVED", "COMPLETED"].includes(spec.status)) {
        workflow.push({ action: "approve", to: "APPROVED", userId: approver?.id ?? admin.id, email: approver?.email ?? admin.email });
        if (result) {
          await prisma.estimateBaseline.create({ data: { estimateId: estimate.id, version: 1, snapshot: JSON.stringify(result), committedBy: approver?.email ?? admin.email } });
        }
      }
      if (spec.status === "REJECTED") workflow.push({ action: "reject", to: "REJECTED", userId: approver?.id ?? admin.id, email: approver?.email ?? admin.email });
      if (spec.status === "RETURNED") workflow.push({ action: "return", to: "RETURNED", userId: reviewer?.id ?? admin.id, email: reviewer?.email ?? admin.email });

      for (const [step, item] of workflow.entries()) {
        const at = new Date(createdAt.getTime() + (step + 2) * 3600_000);
        await prisma.approval.create({ data: { estimateId: estimate.id, action: item.action, comment: `${item.action} on demo CR`, actorEmail: item.email, createdAt: at } });
        await prisma.auditEvent.create({ data: { estimateId: estimate.id, userId: item.userId, action: `ESTIMATE_${item.action.toUpperCase()}`, newValue: item.to, createdAt: at } });
      }

      if (spec.status === "COMPLETED" && result && spec.actualRatio) {
        const payload = {
          actualDevPd: Number((result.adjustedDevEffortPd * spec.actualRatio).toFixed(2)),
          actualQaPd: Number((result.adjustedQaEffortPd * spec.actualRatio).toFixed(2)),
          actualSprints: Number((result.finalSprints * Math.min(spec.actualRatio, 1.3)).toFixed(2)),
          actualDevResources: input.availableDev,
          actualQaResources: input.availableQa,
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
            finalisedAt: new Date(createdAt.getTime() + 21 * 86400_000),
            varianceJson: JSON.stringify(variance),
          },
        });
        await prisma.estimate.update({ where: { id: estimate.id }, data: { status: "COMPLETED" } });
        await prisma.auditEvent.create({ data: { estimateId: estimate.id, userId: estimator.id, action: "ACTUALS_ENTERED", newValue: variance.interpretation } });
      }
    }
    crewSeq++;
  }

  console.log(`Seeded ${created} CRs across ${crewSeq} crews (all lifecycle stages, incl. actuals on completed).`);
}
