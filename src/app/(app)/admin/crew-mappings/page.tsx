import { Suspense } from "react";
import { auth } from "@/auth";
import { can } from "@/lib/access";
import { redirect } from "next/navigation";
import { fromSession } from "@/lib/scope";
import { resolveCrewScope } from "@/lib/crewScope";
import { getActiveConfig } from "@/services/configService";
import { prisma } from "@/lib/prisma";
import { CrewMappingsManager } from "@/components/admin/CrewMappingsManager";
import { MAPPING_TABLE_META } from "@/components/admin/crewMappingTables";

export default async function CrewMappingsPage({
  searchParams,
}: {
  searchParams: Promise<{ table?: string; crew?: string }>;
}) {
  const session = await auth();
  if (!can(session?.user.role, "config.crewMappings")) redirect("/home");

  const { table: tableParam = "ISSUE", crew: crewParam = "" } = await searchParams;
  const table = (["ISSUE", "EPIC", "COMPLEXITY"].includes(tableParam) ? tableParam : "ISSUE") as
    | "ISSUE"
    | "EPIC"
    | "COMPLEXITY";

  const scope = await resolveCrewScope(fromSession(session!.user), crewParam || null);
  const config = await getActiveConfig();

  // The active crew's override for the active table (if any).
  const override = scope.activeCrewId
    ? await prisma.crewMappingOverride.findUnique({
        where: { crewId_table: { crewId: scope.activeCrewId, table } },
      })
    : null;

  const meta = MAPPING_TABLE_META[table];
  const globalRows = (config as unknown as Record<string, unknown[]>)[meta.rowsField] ?? [];
  const overrideRows = override
    ? ((JSON.parse(override.payload)[meta.rowsField] as unknown[]) ?? [])
    : null;

  return (
    <div className="space-y-4">
      <Suspense fallback={<div className="text-sm text-[var(--muted)]">Loading…</div>}>
      <CrewMappingsManager
        table={table}
        units={scope.units}
        lockedUnitIds={scope.lockedUnitIds}
        crews={scope.crews}
        activeCrewId={scope.activeCrewId}
        globalRows={globalRows as Record<string, unknown>[]}
        override={
          override
            ? { status: override.status, version: override.version, rows: overrideRows as Record<string, unknown>[] }
            : null
        }
        canWrite={can(session?.user.role, "config.crewMappings", "RW")}
        canApprove={can(session?.user.role, "config.mappings", "RW")}
      />
      </Suspense>
    </div>
  );
}
