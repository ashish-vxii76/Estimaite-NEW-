import { prisma } from "@/lib/prisma";
import { fromSession, type ScopeUser } from "@/lib/scope";
import { resolveCrewScope } from "@/lib/crewScope";
import { getActiveConfig } from "@/services/configService";
import { MAPPING_TABLE_META } from "@/components/admin/crewMappingTables";

type Table = "ISSUE" | "EPIC" | "COMPLEXITY";
type Row = Record<string, unknown>;

// DEC-011: shared server loader for the three per-crew mapping pages (Issue/Epic/Complexity).
export async function loadMappingPageData(user: ScopeUser, table: Table, crewParam: string) {
  const scope = await resolveCrewScope(fromSession(user), crewParam || null);
  const config = await getActiveConfig();
  const meta = MAPPING_TABLE_META[table];
  const globalRows = ((config as unknown as Record<string, Row[]>)[meta.rowsField] ?? []) as Row[];

  const overrideRow = scope.activeCrewId
    ? await prisma.crewMappingOverride.findUnique({
        where: { crewId_table: { crewId: scope.activeCrewId, table } },
      })
    : null;
  const override = overrideRow
    ? {
        status: overrideRow.status,
        version: overrideRow.version,
        rows: ((JSON.parse(overrideRow.payload)[meta.rowsField] as Row[]) ?? []) as Row[],
      }
    : null;

  return { scope, globalRows, override };
}
