import { prisma } from "@/lib/prisma";
import { DEFAULT_CONFIG, hydrateConfig } from "@/domain/estimation/defaultConfig";
import type { EstimationConfig } from "@/domain/estimation/types";

export async function getActiveConfig(): Promise<EstimationConfig> {
  const row = await prisma.configurationVersion.findFirst({
    where: { active: true },
    orderBy: { createdAt: "desc" },
  });
  if (!row) return DEFAULT_CONFIG;
  return hydrateConfig(JSON.parse(row.payload));
}

export async function saveConfigVersion(config: EstimationConfig, actorUserId?: string) {
  const hydrated = hydrateConfig(config);
  await prisma.configurationVersion.updateMany({ data: { active: false } });
  const id = `cfg-${Date.now()}`;
  const next = { ...hydrated, versionId: id };
  await prisma.configurationVersion.create({
    data: { id, payload: JSON.stringify(next), active: true },
  });
  await prisma.auditEvent.create({
    data: {
      userId: actorUserId,
      action: "CONFIGURATION_VERSION_CREATED",
      previousValue: config.versionId,
      newValue: id,
    },
  });
  await syncOperationalTables(next);
  return next;
}

export async function patchActiveConfig(
  patch: Partial<EstimationConfig>,
  actorUserId?: string,
) {
  const current = await getActiveConfig();
  return saveConfigVersion({ ...current, ...patch }, actorUserId);
}

async function syncOperationalTables(config: EstimationConfig) {
  for (const row of config.costMappings ?? []) {
    await prisma.location.upsert({
      where: { name: row.location },
      update: {
        dailyRate: row.cost,
        currency: row.currency,
        costMethod: row.costMethod,
        standardTeamSize: row.standardTeamSize,
        active: true,
      },
      create: {
        name: row.location,
        dailyRate: row.cost,
        currency: row.currency,
        costMethod: row.costMethod,
        standardTeamSize: row.standardTeamSize,
        active: true,
      },
    });
  }

  for (const row of config.teamCostMappings ?? []) {
    const existing = await prisma.team.findUnique({ where: { name: row.teamName } });
    const resourceSprintRate =
      row.costMethod.toLowerCase().includes("resource")
        ? row.cost
        : row.standardTeamSize > 0
          ? row.cost / row.standardTeamSize
          : row.cost;
    const teamSprintRate = row.costMethod.toLowerCase().includes("team")
      ? row.cost
      : resourceSprintRate * row.standardTeamSize;
    if (existing) {
      await prisma.team.update({
        where: { name: row.teamName },
        data: {
          mappedLocation: row.teamLocation,
          standardTeamSize: row.standardTeamSize,
          currency: row.currency,
          teamSprintRate,
          resourceSprintRate,
          costMethod: row.costMethod,
        },
      });
    } else {
      await prisma.team.create({
        data: {
          name: row.teamName,
          mappedLocation: row.teamLocation,
          standardTeamSize: row.standardTeamSize,
          currency: row.currency,
          teamSprintRate,
          resourceSprintRate,
          costMethod: row.costMethod,
          effectiveFrom: new Date(),
          active: true,
        },
      });
    }
  }
}
