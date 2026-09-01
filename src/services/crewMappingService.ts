import { prisma } from "@/lib/prisma";
import { safeJsonParse } from "@/lib/safeJson";
import type { CrewMappingOverrides } from "@/domain/estimation/crewCalibration";

// DEC-011: per-crew mapping overrides (opt-in, admin-approved). Global is the default: with no
// APPROVED row for a table, that table resolves to global → golden-safe.

export const MAPPING_TABLES = ["ISSUE", "EPIC", "COMPLEXITY"] as const;
export type MappingTable = (typeof MAPPING_TABLES)[number];

/**
 * The APPROVED mapping overrides for a crew, shaped for `resolveCrewConfig`. Only APPROVED rows are
 * applied to estimates; REQUESTED / REVERTED rows never affect calculation. Empty object when the
 * crew has diverged on nothing (the default for every crew today).
 */
export async function getApprovedMappingOverrides(
  crewId: string | null | undefined,
): Promise<CrewMappingOverrides> {
  if (!crewId) return {};
  const rows = await prisma.crewMappingOverride.findMany({
    where: { crewId, status: "APPROVED" },
  });
  const out: CrewMappingOverrides = {};
  for (const row of rows) {
    const payload = safeJsonParse<Record<string, unknown>>(row.payload, {});
    if (row.table === "ISSUE") out.ISSUE = payload as CrewMappingOverrides["ISSUE"];
    else if (row.table === "EPIC") out.EPIC = payload as CrewMappingOverrides["EPIC"];
    else if (row.table === "COMPLEXITY") out.COMPLEXITY = payload as CrewMappingOverrides["COMPLEXITY"];
  }
  return out;
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
