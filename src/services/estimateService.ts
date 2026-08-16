import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  calculateEstimate,
  calculateVariance,
  type EstimateCalculationInput,
} from "@/domain/estimation";
import { getActiveConfig } from "@/services/configService";

const scoreSchema = z.object({
  dimensionId: z.string(),
  score: z.number().int().min(1).max(5),
});

const readinessSchema = z.object({
  criterionId: z.string(),
  answer: z.enum(["YES", "PARTIAL", "NO"]),
});

export const estimateInputSchema = z.object({
  workItemType: z.enum(["ISSUE", "EPIC"]),
  reference: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  teamId: z.string().min(1),
  requester: z.string().min(1),
  jiraId: z.string().optional(),
  project: z.string().optional(),
  programme: z.string().optional(),
  release: z.string().optional(),
  stance: z.enum(["OPTIMISTIC", "NEUTRAL", "PESSIMISTIC"]).default("NEUTRAL"),
  planningMode: z.enum(["RESOURCE_CONSTRAINED", "SPRINT_CONSTRAINED"]).default("RESOURCE_CONSTRAINED"),
  costingModel: z.enum(["RESOURCE_SPRINT", "TEAM_SPRINT"]).default("RESOURCE_SPRINT"),
  currency: z.string().default("GBP"),
  devResourceLevel: z.string().default("intermediate"),
  qaResourceLevel: z.string().default("experienced"),
  devAiProductivity: z.number().min(0).max(0.5).default(0),
  qaAiProductivity: z.number().min(0).max(0.5).default(0),
  availableDev: z.number().int().min(0).default(1),
  availableQa: z.number().int().min(0).default(1),
  targetSprints: z.number().int().min(1).default(1),
  otherFixedCost: z.number().min(0).default(0),
  complexityScores: z.array(scoreSchema).optional(),
  readiness: z.array(readinessSchema).optional(),
  locationMix: z
    .array(
      z.object({
        locationId: z.string(),
        locationName: z.string(),
        allocationPct: z.number(),
        dailyRate: z.number(),
        currency: z.string(),
      }),
    )
    .optional(),
});

export async function createEstimate(data: z.infer<typeof estimateInputSchema>, userId: string) {
  const config = await getActiveConfig();
  const estimate = await prisma.estimate.create({
    data: {
      workItemType: data.workItemType,
      reference: data.reference,
      title: data.title,
      description: data.description ?? "",
      teamId: data.teamId,
      requester: data.requester,
      jiraId: data.jiraId,
      project: data.project,
      programme: data.programme,
      release: data.release,
      stance: data.stance,
      planningMode: data.planningMode,
      costingModel: data.costingModel,
      currency: data.currency,
      devResourceLevel: data.devResourceLevel,
      qaResourceLevel: data.qaResourceLevel,
      devAiProductivity: data.devAiProductivity,
      qaAiProductivity: data.qaAiProductivity,
      availableDev: data.availableDev,
      availableQa: data.availableQa,
      targetSprints: data.targetSprints,
      otherFixedCost: data.otherFixedCost,
      complexityScoresJson: JSON.stringify(data.complexityScores ?? []),
      readinessJson: JSON.stringify(data.readiness ?? []),
      locationMixJson: JSON.stringify(data.locationMix ?? []),
      configurationVersionId: config.versionId,
      rateVersionId: config.rateVersionId,
      createdById: userId,
    },
  });
  await audit(estimate.id, userId, "ESTIMATE_CREATED", "", estimate.reference);
  return estimate;
}

export async function updateEstimate(
  id: string,
  data: Partial<z.infer<typeof estimateInputSchema>>,
  userId: string,
) {
  const existing = await prisma.estimate.findUnique({ where: { id } });
  if (!existing) return null;
  if (!["DRAFT", "RETURNED"].includes(existing.status)) {
    throw new Error("Only draft or returned estimates can be edited");
  }
  const updated = await prisma.estimate.update({
    where: { id },
    data: {
      ...(data.workItemType && { workItemType: data.workItemType }),
      ...(data.reference && { reference: data.reference }),
      ...(data.title && { title: data.title }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.teamId && { teamId: data.teamId }),
      ...(data.requester && { requester: data.requester }),
      ...(data.stance && { stance: data.stance }),
      ...(data.planningMode && { planningMode: data.planningMode }),
      ...(data.costingModel && { costingModel: data.costingModel }),
      ...(data.currency && { currency: data.currency }),
      ...(data.devResourceLevel && { devResourceLevel: data.devResourceLevel }),
      ...(data.qaResourceLevel && { qaResourceLevel: data.qaResourceLevel }),
      ...(data.devAiProductivity !== undefined && { devAiProductivity: data.devAiProductivity }),
      ...(data.qaAiProductivity !== undefined && { qaAiProductivity: data.qaAiProductivity }),
      ...(data.availableDev !== undefined && { availableDev: data.availableDev }),
      ...(data.availableQa !== undefined && { availableQa: data.availableQa }),
      ...(data.targetSprints !== undefined && { targetSprints: data.targetSprints }),
      ...(data.otherFixedCost !== undefined && { otherFixedCost: data.otherFixedCost }),
      ...(data.complexityScores && { complexityScoresJson: JSON.stringify(data.complexityScores) }),
      ...(data.readiness && { readinessJson: JSON.stringify(data.readiness) }),
      ...(data.locationMix && { locationMixJson: JSON.stringify(data.locationMix) }),
    },
  });
  await audit(id, userId, "ESTIMATE_EDITED", existing.title, updated.title);
  return updated;
}

export async function calculateAndPersist(id: string, userId: string) {
  const estimate = await prisma.estimate.findUnique({
    where: { id },
    include: { team: true },
  });
  if (!estimate) return null;
  const configRow = await prisma.configurationVersion.findUnique({
    where: { id: estimate.configurationVersionId },
  });
  const config = configRow ? JSON.parse(configRow.payload) : await getActiveConfig();

  const input: EstimateCalculationInput = {
    workItemType: estimate.workItemType as EstimateCalculationInput["workItemType"],
    complexityScores: JSON.parse(estimate.complexityScoresJson),
    readiness: JSON.parse(estimate.readinessJson),
    stance: estimate.stance as EstimateCalculationInput["stance"],
    overrideEnabled: estimate.overrideEnabled,
    overrideSp: estimate.overrideSp,
    devResourceLevelId: estimate.devResourceLevel,
    qaResourceLevelId: estimate.qaResourceLevel,
    devAiProductivityPct: estimate.devAiProductivity,
    qaAiProductivityPct: estimate.qaAiProductivity,
    planningMode: estimate.planningMode as EstimateCalculationInput["planningMode"],
    availableDev: estimate.availableDev,
    availableQa: estimate.availableQa,
    targetSprints: estimate.targetSprints,
    costingModel: estimate.costingModel as EstimateCalculationInput["costingModel"],
    resourceSprintRate: estimate.team.resourceSprintRate,
    teamSprintRate: estimate.team.teamSprintRate,
    otherFixedCost: estimate.otherFixedCost,
    locationAllocations: JSON.parse(estimate.locationMixJson),
    currency: estimate.currency,
  };

  const result = calculateEstimate(input, config);
  const updated = await prisma.estimate.update({
    where: { id },
    data: { resultJson: JSON.stringify(result) },
    include: { team: true, createdBy: true, approvals: true, actuals: true },
  });
  await prisma.estimateVersion.create({
    data: { estimateId: id, snapshot: JSON.stringify({ estimate: updated, result }) },
  });
  await audit(id, userId, "ESTIMATE_CALCULATED", "", result.governanceDecision);
  return { estimate: updated, result };
}

export async function transitionStatus(
  id: string,
  action: "submit" | "review" | "approve" | "reject" | "return",
  userId: string,
  email: string,
  comment = "",
) {
  const estimate = await prisma.estimate.findUnique({ where: { id } });
  if (!estimate) return null;
  const map: Record<string, { from: string[]; to: string }> = {
    submit: { from: ["DRAFT", "RETURNED"], to: "READY_FOR_REVIEW" },
    review: { from: ["READY_FOR_REVIEW"], to: "REVIEWED" },
    approve: { from: ["REVIEWED", "READY_FOR_REVIEW"], to: "APPROVED" },
    reject: { from: ["READY_FOR_REVIEW", "REVIEWED"], to: "REJECTED" },
    return: { from: ["READY_FOR_REVIEW", "REVIEWED"], to: "RETURNED" },
  };
  const spec = map[action];
  if (!spec.from.includes(estimate.status)) {
    throw new Error(`Cannot ${action} from ${estimate.status}`);
  }
  const updated = await prisma.estimate.update({
    where: { id },
    data: { status: spec.to },
  });
  await prisma.approval.create({
    data: { estimateId: id, action, comment, actorEmail: email },
  });
  await audit(id, userId, `ESTIMATE_${action.toUpperCase()}`, estimate.status, spec.to);
  return updated;
}

export async function applyOverride(
  id: string,
  payload: { overrideSp: number; reason: string; requestedBy: string },
  userId: string,
) {
  const estimate = await prisma.estimate.findUnique({ where: { id } });
  if (!estimate) return null;
  if (!payload.reason.trim()) throw new Error("Override reason is required");
  await prisma.estimate.update({
    where: { id },
    data: {
      overrideEnabled: true,
      overrideSp: payload.overrideSp,
      overrideReason: payload.reason,
      overrideRequestedBy: payload.requestedBy,
      overrideAt: new Date(),
    },
  });
  await audit(
    id,
    userId,
    "MANUAL_OVERRIDE",
    String(estimate.overrideSp ?? ""),
    String(payload.overrideSp),
  );
  return calculateAndPersist(id, userId);
}

export async function captureActuals(
  id: string,
  payload: {
    actualDevPd: number;
    actualQaPd: number;
    actualSprints: number;
    actualDevResources: number;
    actualQaResources: number;
    actualOtherCost: number;
    completionDate?: string;
  },
  userId: string,
) {
  const estimate = await prisma.estimate.findUnique({ where: { id } });
  if (!estimate?.resultJson) throw new Error("Calculate the estimate before capturing actuals");
  const result = JSON.parse(estimate.resultJson);
  const variance = calculateVariance({
    actualDevPd: payload.actualDevPd,
    actualQaPd: payload.actualQaPd,
    actualSprints: payload.actualSprints,
    actualCost: result.aiAdjustedDeliveryCost + payload.actualOtherCost,
    estimatedDevPd: result.adjustedDevEffortPd,
    estimatedQaPd: result.adjustedQaEffortPd,
    estimatedSprints: result.finalSprints,
    estimatedCost: result.aiAdjustedDeliveryCost,
  });
  const actuals = await prisma.actualDelivery.upsert({
    where: { estimateId: id },
    update: {
      ...payload,
      completionDate: payload.completionDate ? new Date(payload.completionDate) : null,
      varianceJson: JSON.stringify(variance),
    },
    create: {
      estimateId: id,
      ...payload,
      completionDate: payload.completionDate ? new Date(payload.completionDate) : null,
      varianceJson: JSON.stringify(variance),
    },
  });
  await prisma.estimate.update({ where: { id }, data: { status: "COMPLETED" } });
  await audit(id, userId, "ACTUALS_ENTERED", "", JSON.stringify(payload));
  return { actuals, variance };
}

async function audit(
  estimateId: string,
  userId: string | undefined,
  action: string,
  previousValue: string,
  newValue: string,
) {
  await prisma.auditEvent.create({
    data: { estimateId, userId, action, previousValue, newValue },
  });
}
