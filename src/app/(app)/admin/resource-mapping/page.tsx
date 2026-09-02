import { Suspense } from "react";
import { auth } from "@/auth";
import { can } from "@/lib/access";
import { redirect } from "next/navigation";
import { loadMappingPageData } from "@/lib/mappingPageData";
import { MappingPageShell } from "@/components/admin/MappingPageShell";
import type { Column } from "@/components/admin/MappingEditor";

const COLUMNS: Column[] = [
  { key: "id", label: "Level ID" },
  { key: "name", label: "Resource Level" },
  { key: "capacitySpPerSprint", label: "SP Capacity / Sprint", type: "number" },
  { key: "daysPerPoint", label: "Days / Point", type: "number" },
  { key: "definition", label: "Definition" },
  { key: "rule", label: "Rule" },
];

export default async function ResourceMappingPage({
  searchParams,
}: {
  searchParams: Promise<{ crew?: string }>;
}) {
  const session = await auth();
  const role = session?.user.role;
  if (!can(role, "config.mappings") && !can(role, "config.crewMappings")) redirect("/home");
  const { crew = "" } = await searchParams;
  const { scope, globalRows, override } = await loadMappingPageData(session!.user, "RESOURCE_LEVELS", crew);

  return (
    <Suspense fallback={<div className="text-sm text-[var(--muted)]">Loading…</div>}>
      <MappingPageShell
        table="RESOURCE_LEVELS"
        title="Resource Mapping"
        description="Resource Level, SP Capacity / Sprint, Days per Point, Definition and Rule. Capacity feeds planning; Days/Point feeds resource-aware effort. Set globally, or override per crew (admin-approved) — calibration still tunes Days/Point on top."
        section="resourceLevels"
        columns={COLUMNS}
        globalRows={globalRows}
        units={scope.units}
        lockedUnitIds={scope.lockedUnitIds}
        crews={scope.crews}
        activeCrewId={scope.activeCrewId}
        scopeType={scope.activeScopeType}
        scopeName={scope.activeScopeName}
        override={override}
        canEditGlobal={can(role, "config.mappings", "RW")}
        canWriteCrew={can(role, "config.crewMappings", "RW")}
        canApprove={can(role, "config.mappings", "RW")}
      />
    </Suspense>
  );
}
