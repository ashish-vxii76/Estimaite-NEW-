import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  calculateEstimate,
  calculateVariance,
  hydrateConfig,
  simulateCostRange,
  type EstimateCalculationInput,
} from "@/domain/estimation";
import { getActiveConfig } from "@/services/configService";
import { resolveOrgPathForTeam } from "@/services/orgService";
import { appendAuditEvent } from "@/services/auditService";
import { safeJsonParse } from "@/lib/safeJson";

const scoreSchema = z.object({
  dimensionId: z.string(),
  score: z.number().int().min(1).max(5),
});

const readinessSchema = z.object({
  criterionId: z.string(),
  answer: z.enum(["YES", "NO"]),
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
  costingBasis: z.enum(["TEAM", "LOCATION"]).optional(),
  locationName: z.string().optional(),
  costMethod: z.string().optional(),
  projectOverrideRate: z.number().min(0).nullable().optional(),
  currency: z.string().default("CHF"),
  devResourceLevel: z.string().default("intermediate"),
  qaResourceLevel: z.string().default("experienced"),
  devAiProductivity: z.number().min(0).max(1).default(0),
  qaAiProductivity: z.number().min(0).max(1).default(0),
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

function commercialMix(data: Partial<z.infer<typeof estimateInputSchema>>) {
  const mix = [...(data.locationMix ?? [])];
  if (mix.length === 0) {
    mix.push({
      locationId: data.locationName ?? "",
      locationName: data.locationName ?? "",
      allocationPct: 0,
      dailyRate: 0,
      currency: data.currency ?? "CHF",
    });
  }
  return mix.map((row, index) =>
    index === 0
      ? {
          ...row,
          costingBasis: data.costingBasis ?? "TEAM",
          costMethod: data.costMethod ?? "Resource Cost per Sprint",
          projectOverrideRate: data.projectOverrideRate ?? null,
          locationName: data.locationName ?? row.locationName,
        }
      : row,
  );
}

export async function createEstimate(data: z.infer<typeof estimateInputSchema>, userId: string) {
  const config = await getActiveConfig();
  const orgPath = await resolveOrgPathForTeam(data.teamId);
  // Real input pinning: snapshot the roster + team rate/mix used, so a later recompute
  // re-derives identically even if the team's roster or rates change afterwards.
  const team = await prisma.team.findUnique({ where: { id: data.teamId } });
  const members = await prisma.teamMember.findMany({ where: { teamId: data.teamId } });
  const pinnedInputs = {
    roster: members.map((m) => ({
      name: m.name,
      roleStream: m.roleStream,
      location: m.location,
      resourceLevel: m.resourceLevel,
    })),
    team: team
      ? {
          name: team.name,
          resourceSprintRate: team.resourceSprintRate,
          teamSprintRate: team.teamSprintRate,
          standardTeamSize: team.standardTeamSize,
          currency: team.currency,
          locationMixJson: team.locationMixJson,
          mappedLocation: team.mappedLocation,
        }
      : null,
  };
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
      locationMixJson: JSON.stringify(commercialMix(data)),
      orgPathJson: orgPath ? JSON.stringify(orgPath) : "",
      configurationVersionId: config.versionId,
      rateVersionId: config.rateVersionId,
      pinnedInputsJson: JSON.stringify(pinnedInputs),
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
  expectedUpdatedAt?: string,
) {
  const existing = await prisma.estimate.findUnique({ where: { id } });
  if (!existing) return null;
  if (!["DRAFT", "RETURNED"].includes(existing.status)) {
    throw new Error("Only draft or returned estimates can be edited");
  }
  // #5 optimistic locking: reject a save based on a stale copy.
  if (expectedUpdatedAt && existing.updatedAt.toISOString() !== expectedUpdatedAt) {
    throw new Error("This estimate was changed elsewhere since you opened it — reload and try again");
  }
  const teamId = data.teamId ?? existing.teamId;
  const orgPath =
    data.teamId && data.teamId !== existing.teamId
      ? await resolveOrgPathForTeam(teamId)
      : existing.orgPathJson
        ? null
        : await resolveOrgPathForTeam(teamId);
  const updated = await prisma.estimate.update({
    where: { id },
    data: {
      ...(data.workItemType && { workItemType: data.workItemType }),
      ...(data.reference && { reference: data.reference }),
      ...(data.title && { title: data.title }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.teamId && { teamId: data.teamId }),
      ...(data.requester && { requester: data.requester }),
      ...(data.jiraId !== undefined && { jiraId: data.jiraId }),
      ...(data.project !== undefined && { project: data.project }),
      ...(data.programme !== undefined && { programme: data.programme }),
      ...(data.release !== undefined && { release: data.release }),
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
      ...((data.locationMix || data.costingBasis || data.locationName || data.costMethod || data.projectOverrideRate !== undefined) && {
        locationMixJson: JSON.stringify(commercialMix(data)),
      }),
      ...(orgPath ? { orgPathJson: JSON.stringify(orgPath) } : {}),
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
  const config = hydrateConfig(
    configRow ? JSON.parse(configRow.payload) : await getActiveConfig(),
  );

  // Prefer the pinned snapshot taken at creation; fall back to live for legacy estimates.
  const pinned = safeJsonParse<{
    roster?: Array<{ name: string; roleStream: string; location: string; resourceLevel: string }>;
    team?: {
      name: string;
      resourceSprintRate: number;
      teamSprintRate: number;
      standardTeamSize: number;
      currency: string;
      locationMixJson: string;
      mappedLocation: string;
    } | null;
  } | null>(estimate.pinnedInputsJson, null);
  const pinnedTeam = pinned?.team ?? null;

  const teamCost = config.teamCostMappings?.find(
    (t) => t.teamName === (pinnedTeam?.name ?? estimate.team.name),
  );
  const storedMix = safeJsonParse(estimate.locationMixJson, []) as Array<
    EstimateCalculationInput["locationAllocations"][number] & {
      costingBasis?: "TEAM" | "LOCATION";
      locationName?: string;
      costMethod?: string;
      projectOverrideRate?: number | null;
    }
  >;
  const commercial = Array.isArray(storedMix) ? storedMix[0] : undefined;
  const teamMix = safeJsonParse(pinnedTeam?.locationMixJson ?? estimate.team.locationMixJson, []) as {
    location: string;
    allocationPct: number;
  }[];
  const rosterSource =
    pinned?.roster ??
    (await prisma.teamMember.findMany({ where: { teamId: estimate.teamId } })).map((m) => ({
      name: m.name,
      roleStream: m.roleStream,
      location: m.location,
      resourceLevel: m.resourceLevel,
    }));
  const roster = rosterSource.map((m) => ({
    name: m.name,
    roleStream: m.roleStream,
    location: m.location,
    seniority: m.resourceLevel,
    headcount: 1,
  }));
  const mixHasAllocation = Array.isArray(storedMix) && storedMix.some((m) => (m.allocationPct ?? 0) > 0);
  const locationAllocations = mixHasAllocation
    ? storedMix.map((m) => ({
        locationId: m.locationId,
        locationName: m.locationName,
        allocationPct: m.allocationPct,
        dailyRate: m.dailyRate,
        currency: m.currency,
      }))
    : teamMix.map((m) => {
        const rate = config.locationDailyRates.find((c) => c.location === m.location);
        return {
          locationId: m.location,
          locationName: m.location,
          allocationPct: m.allocationPct,
          dailyRate: rate?.dailyRate ?? 0,
          currency: rate?.currency ?? estimate.team.currency,
        };
      });

  const costingBasis = (commercial?.costingBasis ?? "TEAM") as EstimateCalculationInput["costingBasis"];
  const locationName =
    commercial?.locationName || pinnedTeam?.mappedLocation || estimate.team.mappedLocation;
  const input: EstimateCalculationInput = {
    workItemType: estimate.workItemType as EstimateCalculationInput["workItemType"],
    complexityScores: safeJsonParse(estimate.complexityScoresJson, []),
    readiness: safeJsonParse(estimate.readinessJson, []),
    stance: estimate.stance as EstimateCalculationInput["stance"],
    overrideEnabled: estimate.overrideEnabled,
    overrideSp: estimate.overrideSp,
    overrideReason: estimate.overrideReason,
    overrideApprovedBy: estimate.overrideApprovedBy,
    projectOverrideRate: commercial?.projectOverrideRate ?? null,
    costingBasis,
    teamId: estimate.teamId,
    teamName: pinnedTeam?.name ?? estimate.team.name,
    locationName,
    costMethod: commercial?.costMethod ?? "Resource Cost per Sprint",
    devResourceLevelId: estimate.devResourceLevel,
    qaResourceLevelId: estimate.qaResourceLevel,
    devAiProductivityPct: estimate.devAiProductivity,
    qaAiProductivityPct: estimate.qaAiProductivity,
    planningMode: estimate.planningMode as EstimateCalculationInput["planningMode"],
    availableDev: estimate.availableDev,
    availableQa: estimate.availableQa,
    targetSprints: estimate.targetSprints,
    costingModel: "RESOURCE_SPRINT",
    resourceSprintRate:
      teamCost?.resourceSprintCost ?? pinnedTeam?.resourceSprintRate ?? estimate.team.resourceSprintRate,
    teamSprintRate: teamCost?.teamSprintCost ?? pinnedTeam?.teamSprintRate ?? estimate.team.teamSprintRate,
    otherFixedCost: estimate.workItemType === "EPIC" ? 0 : estimate.otherFixedCost,
    locationAllocations,
    roster,
    currency: teamCost?.currency ?? estimate.currency,
    standardTeamSize:
      teamCost?.standardTeamSize ?? pinnedTeam?.standardTeamSize ?? estimate.team.standardTeamSize,
  };

  const result = calculateEstimate(input, config);
  // #17: attach the deterministic P50/P80 cost confidence range.
  const range = simulateCostRange(input, config);
  result.costP50 = range.costP50;
  result.costP80 = range.costP80;
  result.explanations.costRange = range.explanation;
  // Atomic: persist result + version snapshot + audit as one unit.
  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.estimate.update({
      where: { id },
      data: {
        resultJson: JSON.stringify(result),
        // Denormalised for server-side filtering + pagination of the register.
        effectiveTshirt: result.effectiveTshirt ?? "",
        deliveryFlag: result.deliveryFlag ?? result.governanceDecision ?? "",
      },
      include: { team: true, createdBy: true, approvals: true, actuals: true },
    });
    await tx.estimateVersion.create({
      data: { estimateId: id, snapshot: JSON.stringify({ estimate: row, result }) },
    });
    await appendAuditEvent(
      { estimateId: id, userId, action: "ESTIMATE_CALCULATED", newValue: result.governanceDecision },
      tx,
    );
    return row;
  });
  return { estimate: updated, result };
}

export async function transitionStatus(
  id: string,
  action: "submit" | "review" | "approve" | "reject" | "return",
  userId: string,
  email: string,
  comment = "",
) {
  const map: Record<string, { from: string[]; to: string }> = {
    submit: { from: ["DRAFT", "RETURNED"], to: "READY_FOR_REVIEW" },
    review: { from: ["READY_FOR_REVIEW"], to: "REVIEWED" },
    approve: { from: ["REVIEWED", "READY_FOR_REVIEW"], to: "APPROVED" },
    reject: { from: ["READY_FOR_REVIEW", "REVIEWED"], to: "REJECTED" },
    return: { from: ["READY_FOR_REVIEW", "REVIEWED"], to: "RETURNED" },
  };
  const spec = map[action];

  // Governance #3: the read (status + segregation-of-duties check) and the write
  // must be ATOMIC. Doing them in one transaction serializes concurrent transitions,
  // so two racing approvals can't both pass the two-person check before either writes.
  return prisma.$transaction(async (tx) => {
    const estimate = await tx.estimate.findUnique({ where: { id } });
    if (!estimate) return null;

    if (!spec.from.includes(estimate.status)) {
      throw new Error(`Cannot ${action} from ${estimate.status}`);
    }
    if ((action === "review" || action === "approve" || action === "reject") && estimate.createdById === userId) {
      throw new Error("You cannot review or approve a record you created");
    }
    if (action === "approve" || action === "reject") {
      const prior = await tx.approval.findFirst({
        where: { estimateId: id, action: "review" },
        orderBy: { createdAt: "desc" },
      });
      if (prior && prior.actorEmail === email) {
        throw new Error("Two-person rule: the reviewer cannot also approve or reject");
      }
    }
    const updated = await tx.estimate.update({
      where: { id },
      data: { status: spec.to },
    });
    await tx.approval.create({
      data: { estimateId: id, action, comment, actorEmail: email },
    });
    await appendAuditEvent(
      { estimateId: id, userId, action: `ESTIMATE_${action.toUpperCase()}`, previousValue: estimate.status, newValue: spec.to },
      tx,
    );
    return updated;
  });
}

export async function applyOverride(
  id: string,
  payload: { overrideSp: number; reason: string; requestedBy: string },
  userId: string,
) {
  const estimate = await prisma.estimate.findUnique({ where: { id } });
  if (!estimate) return null;
  if (!payload.reason.trim()) throw new Error("Override reason is required");
  await prisma.$transaction(async (tx) => {
    await tx.estimate.update({
      where: { id },
      data: {
        overrideEnabled: true,
        overrideSp: payload.overrideSp,
        overrideReason: payload.reason,
        overrideRequestedBy: payload.requestedBy,
        overrideAt: new Date(),
      },
    });
    await appendAuditEvent(
      {
        estimateId: id,
        userId,
        action: "MANUAL_OVERRIDE",
        previousValue: String(estimate.overrideSp ?? ""),
        newValue: String(payload.overrideSp),
      },
      tx,
    );
  });
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
  const result = safeJsonParse<Record<string, number> | null>(estimate.resultJson, null);
  if (!result) throw new Error("Estimate result is unreadable — recalculate before capturing actuals");
  const variance = calculateVariance({
    actualDevPd: payload.actualDevPd,
    actualQaPd: payload.actualQaPd,
    actualSprints: payload.actualSprints,
    actualCost: (result.aiAdjustedDeliveryCost ?? 0) + payload.actualOtherCost,
    estimatedDevPd: result.adjustedDevEffortPd,
    estimatedQaPd: result.adjustedQaEffortPd,
    estimatedSprints: result.finalSprints,
    estimatedCost: result.aiAdjustedDeliveryCost ?? 0,
  });
  const actuals = await prisma.$transaction(async (tx) => {
    const row = await tx.actualDelivery.upsert({
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
    await tx.estimate.update({ where: { id }, data: { status: "COMPLETED" } });
    await appendAuditEvent(
      { estimateId: id, userId, action: "ACTUALS_ENTERED", newValue: JSON.stringify(payload) },
      tx,
    );
    return row;
  });
  return { actuals, variance };
}

/** Persist a what-if sandbox snapshot on the estimate (does not change governed result/team/status). */
export async function saveEstimateScenario(
  id: string,
  payload: {
    objective: string;
    maxSprints?: number | null;
    selectedTeamId: string;
    scenario: unknown;
  },
  userId: string,
) {
  const estimate = await prisma.estimate.findUnique({ where: { id } });
  if (!estimate) throw new Error("Estimate not found");
  if (!["READY_FOR_REVIEW", "REVIEWED", "APPROVED", "COMPLETED"].includes(estimate.status)) {
    throw new Error("Scenarios can only be saved after the estimate is submitted");
  }
  const snapshot = {
    savedAt: new Date().toISOString(),
    objective: payload.objective,
    maxSprints: payload.maxSprints ?? null,
    selectedTeamId: payload.selectedTeamId,
    scenario: payload.scenario,
  };
  const updated = await prisma.estimate.update({
    where: { id },
    data: { scenarioJson: JSON.stringify(snapshot) },
  });
  await audit(
    id,
    userId,
    "SCENARIO_SAVED",
    estimate.scenarioJson ?? "",
    JSON.stringify({
      objective: snapshot.objective,
      selectedTeamId: snapshot.selectedTeamId,
      recommendedTeam:
        (payload.scenario as { recommended?: { teamName?: string } } | null)?.recommended
          ?.teamName ?? null,
      savedAt: snapshot.savedAt,
    }),
  );
  return { estimate: updated, scenario: snapshot };
}

/**
 * Promote a sandbox mix into the governed estimate (review/approval stage only).
 * Updates staffing (+ optional team), recalculates, audits — does not change status.
 */
export async function acceptEstimateScenario(
  id: string,
  payload: {
    source: "selected" | "recommended";
    applyTeam: boolean;
    mix: {
      teamId: string;
      teamName: string;
      bestDevLevel: string;
      bestQaLevel: string;
      devCount: number;
      qaCount: number;
    };
  },
  userId: string,
) {
  const estimate = await prisma.estimate.findUnique({
    where: { id },
    include: { team: true },
  });
  if (!estimate) throw new Error("Estimate not found");
  if (!["READY_FOR_REVIEW", "REVIEWED"].includes(estimate.status)) {
    throw new Error("Accept is only available during Ready for review or Reviewed");
  }

  const config = await getActiveConfig();
  const byName = Object.fromEntries(config.resourceLevels.map((l) => [l.name.toLowerCase(), l]));
  const byId = Object.fromEntries(config.resourceLevels.map((l) => [l.id, l]));
  const resolveLevel = (value: string) =>
    byId[value] ?? byName[value.toLowerCase()] ?? null;
  const devLevel = resolveLevel(payload.mix.bestDevLevel);
  const qaLevel = resolveLevel(payload.mix.bestQaLevel);
  if (!devLevel || !qaLevel) {
    throw new Error("Could not map scenario resource levels to configuration");
  }

  const nextTeamId = payload.applyTeam ? payload.mix.teamId : estimate.teamId;
  if (payload.applyTeam) {
    const team = await prisma.team.findUnique({ where: { id: nextTeamId } });
    if (!team || !team.active) throw new Error("Selected team is not available");
  }

  const before = {
    teamId: estimate.teamId,
    teamName: estimate.team.name,
    devResourceLevel: estimate.devResourceLevel,
    qaResourceLevel: estimate.qaResourceLevel,
    availableDev: estimate.availableDev,
    availableQa: estimate.availableQa,
    planningMode: estimate.planningMode,
    result: safeJsonParse<Record<string, number> | null>(estimate.resultJson, null),
  };

  await prisma.estimate.update({
    where: { id },
    data: {
      teamId: nextTeamId,
      devResourceLevel: devLevel.id,
      qaResourceLevel: qaLevel.id,
      availableDev: payload.mix.devCount,
      availableQa: payload.mix.qaCount,
      planningMode: "RESOURCE_CONSTRAINED",
    },
  });

  const recalculatedBundle = await calculateAndPersist(id, userId);
  if (!recalculatedBundle) throw new Error("Estimate not found after accept");
  const { estimate: recalculated, result } = recalculatedBundle;
  const after = {
    teamId: recalculated.teamId,
    teamName: recalculated.team?.name ?? payload.mix.teamName,
    devResourceLevel: recalculated.devResourceLevel,
    qaResourceLevel: recalculated.qaResourceLevel,
    availableDev: recalculated.availableDev,
    availableQa: recalculated.availableQa,
    planningMode: recalculated.planningMode,
    selectedSp: result.selectedSp,
    aiAdjustedDeliveryCost: result.aiAdjustedDeliveryCost,
    finalSprints: result.finalSprints,
  };

  await audit(
    id,
    userId,
    "SCENARIO_ACCEPTED",
    JSON.stringify({
      source: payload.source,
      applyTeam: payload.applyTeam,
      before: {
        teamId: before.teamId,
        teamName: before.teamName,
        devResourceLevel: before.devResourceLevel,
        qaResourceLevel: before.qaResourceLevel,
        availableDev: before.availableDev,
        availableQa: before.availableQa,
        selectedSp: before.result?.selectedSp ?? null,
        aiAdjustedDeliveryCost: before.result?.aiAdjustedDeliveryCost ?? null,
        finalSprints: before.result?.finalSprints ?? null,
      },
    }),
    JSON.stringify(after),
  );

  return { estimate: recalculated, result, before, after };
}

async function audit(
  estimateId: string,
  userId: string | undefined,
  action: string,
  previousValue: string,
  newValue: string,
) {
  await appendAuditEvent({ estimateId, userId, action, previousValue, newValue });
}
