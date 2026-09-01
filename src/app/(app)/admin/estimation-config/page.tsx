import { Suspense } from "react";
import { auth } from "@/auth";
import { can } from "@/lib/access";
import { redirect } from "next/navigation";
import { fromSession } from "@/lib/scope";
import { resolveCrewScope } from "@/lib/crewScope";
import { getActiveConfig } from "@/services/configService";
import { prisma } from "@/lib/prisma";
import { safeJsonParse } from "@/lib/safeJson";
import { EstimationConfigCrewShell } from "@/components/admin/EstimationConfigCrewShell";

export default async function EstimationConfigPage({
  searchParams,
}: {
  searchParams: Promise<{ crew?: string }>;
}) {
  const session = await auth();
  const role = session?.user.role;
  if (!can(role, "config.mappings") && !can(role, "config.crewMappings")) redirect("/home");
  const { crew = "" } = await searchParams;
  const scope = await resolveCrewScope(fromSession(session!.user), crew || null);
  const config = await getActiveConfig();

  const overrideRow = scope.activeCrewId
    ? await prisma.crewMappingOverride.findUnique({
        where: { crewId_table: { crewId: scope.activeCrewId, table: "ESTIMATION_CONFIG" } },
      })
    : null;
  const override = overrideRow
    ? {
        status: overrideRow.status,
        version: overrideRow.version,
        fields: safeJsonParse<Record<string, number>>(overrideRow.payload, {}),
      }
    : null;

  return (
    <Suspense fallback={<div className="text-sm text-[var(--muted)]">Loading…</div>}>
      <EstimationConfigCrewShell
        config={config}
        units={scope.units}
        lockedUnitIds={scope.lockedUnitIds}
        crews={scope.crews}
        activeCrewId={scope.activeCrewId}
        override={override}
        canEditGlobal={can(role, "config.mappings", "RW")}
        canWriteCrew={can(role, "config.crewMappings", "RW")}
        canApprove={can(role, "config.mappings", "RW")}
      />
    </Suspense>
  );
}
