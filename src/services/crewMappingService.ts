import { prisma } from "@/lib/prisma";
import { safeJsonParse } from "@/lib/safeJson";
import type { CrewConfigOverrides } from "@/domain/estimation/crewCalibration";

// DEC-011 / DEC-013: per-crew config overrides (opt-in, admin-approved). Global is the default: with
// no APPROVED row for a domain, that domain resolves to global → golden-safe.

// DEC-011 mapping domains + DEC-013 crew-scoped rate/config domains. (Team Sprint Rates are per-pod
// via the Team record and need no override row here.)
export const MAPPING_TABLES = [
  "ISSUE",
  "EPIC",
  "COMPLEXITY",
  "LOCATION_SPRINT_RATES",
  "LOCATION_DAILY_RATES",
  "TEAM_SPRINT_RATES",
  "ESTIMATION_CONFIG",
] as const;
export type MappingTable = (typeof MAPPING_TABLES)[number];

/**
 * A crew's APPROVED overrides merged into the config fields they replace, shaped for
 * `resolveCrewConfig`. Only APPROVED rows are applied to estimates; REQUESTED / REVERTED rows never
 * affect calculation. Empty object when the crew has diverged on nothing (the default today).
 * Each row's payload already stores exactly the governed-safe config fields for its domain, so
 * merging the payloads yields the override field-partial.
 */
export async function getApprovedMappingOverrides(
  crewId: string | null | undefined,
): Promise<CrewConfigOverrides> {
  if (!crewId) return {};
  const rows = await prisma.crewMappingOverride.findMany({
    where: { crewId, status: "APPROVED" },
  });
  const out: Record<string, unknown> = {};
  for (const row of rows) {
    Object.assign(out, safeJsonParse<Record<string, unknown>>(row.payload, {}));
  }
  return out as CrewConfigOverrides;
}

export type DivergedCrew = { crewId: string; crewName: string; tables: MappingTable[] };

/**
 * DEC-011 M5: crews with an APPROVED mapping override in the given scope. A diverged crew's story
 * points are NOT comparable with other crews' — cross-crew rollups must compare in person-days
 * (DEC-010). Used to surface the comparability warning on the roll-up. Empty scope / no divergence
 * → empty array (the default state today).
 */
export async function listDivergedCrews(crewIds?: string[] | null): Promise<DivergedCrew[]> {
  if (crewIds && crewIds.length === 0) return [];
  const rows = await prisma.crewMappingOverride.findMany({
    where: { status: "APPROVED", ...(crewIds ? { crewId: { in: crewIds } } : {}) },
    include: { crew: { select: { name: true } } },
    orderBy: { crew: { name: "asc" } },
  });
  const byCrew = new Map<string, DivergedCrew>();
  for (const r of rows) {
    const entry = byCrew.get(r.crewId) ?? { crewId: r.crewId, crewName: r.crew.name, tables: [] };
    entry.tables.push(r.table as MappingTable);
    byCrew.set(r.crewId, entry);
  }
  return [...byCrew.values()];
}

/**
 * DEC-014 G3/G4/G5: crews that are NO LONGER COMPARABLE EVEN IN PERSON-DAYS — those whose APPROVED
 * ESTIMATION_CONFIG override changes a Tier-3 field (complexity multipliers or the calibration floor),
 * i.e. the effort scale / confidence floor itself. Their calibration is advisory-only. This is a
 * strict superset-flag beyond `listDivergedCrews` (which is only SP/cost-scope-dependent).
 */
export async function listPdIncomparableCrews(
  crewIds?: string[] | null,
): Promise<{ crewId: string; crewName: string }[]> {
  if (crewIds && crewIds.length === 0) return [];
  const { getActiveConfig } = await import("@/services/configService");
  const config = await getActiveConfig();
  const rows = await prisma.crewMappingOverride.findMany({
    where: {
      status: "APPROVED",
      table: "ESTIMATION_CONFIG",
      ...(crewIds ? { crewId: { in: crewIds } } : {}),
    },
    include: { crew: { select: { name: true } } },
    orderBy: { crew: { name: "asc" } },
  });
  const out: { crewId: string; crewName: string }[] = [];
  for (const r of rows) {
    const p = safeJsonParse<Record<string, unknown>>(r.payload, {});
    const pm = (p.complexityMultipliers as Record<string, number> | undefined) ?? undefined;
    const multChanged =
      !!pm && Object.keys(config.complexityMultipliers).some(
        (k) => pm[k] !== (config.complexityMultipliers as Record<string, number>)[k],
      );
    const floorChanged = p.calibrationMinSamples != null && Number(p.calibrationMinSamples) !== config.calibrationMinSamples;
    if (multChanged || floorChanged) out.push({ crewId: r.crewId, crewName: r.crew.name });
  }
  return out;
}
