import { prisma } from "@/lib/prisma";
import { DEFAULT_CONFIG } from "@/domain/estimation/defaultConfig";
import type { EstimationConfig } from "@/domain/estimation/types";

export async function getActiveConfig(): Promise<EstimationConfig> {
  const row = await prisma.configurationVersion.findFirst({
    where: { active: true },
    orderBy: { createdAt: "desc" },
  });
  if (!row) return DEFAULT_CONFIG;
  return JSON.parse(row.payload) as EstimationConfig;
}

export async function saveConfigVersion(config: EstimationConfig, actorUserId?: string) {
  await prisma.configurationVersion.updateMany({ data: { active: false } });
  const id = `cfg-${Date.now()}`;
  const next = { ...config, versionId: id };
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
  return next;
}
