import { Suspense } from "react";
import { auth } from "@/auth";
import { can } from "@/lib/access";
import { redirect } from "next/navigation";
import { loadMappingPageData } from "@/lib/mappingPageData";
import { MappingPageShell } from "@/components/admin/MappingPageShell";
import type { Column } from "@/components/admin/MappingEditor";

const COLUMNS: Column[] = [
  { key: "lower", label: "Lower", type: "number" },
  { key: "upper", label: "Upper", type: "number" },
  { key: "tshirt", label: "T-Shirt Size", type: "select", options: ["XS", "S", "M", "L", "XL", "XXL"] },
  { key: "complexity", label: "Complexity" },
  {
    key: "governance",
    label: "Governance",
    type: "select",
    options: ["READY", "REVIEW", "SPLIT", "PLAN", "DECOMPOSE", "SPLIT EPIC"],
  },
  { key: "interpretation", label: "Interpretation" },
];

export default async function ComplexityMappingPage({
  searchParams,
}: {
  searchParams: Promise<{ crew?: string }>;
}) {
  const session = await auth();
  const role = session?.user.role;
  if (!can(role, "config.mappings") && !can(role, "config.crewMappings")) redirect("/home");
  const { crew = "" } = await searchParams;
  const { scope, globalRows, override } = await loadMappingPageData(session!.user, "COMPLEXITY", crew);

  return (
    <Suspense fallback={<div className="text-sm text-[var(--muted)]">Loading…</div>}>
      <MappingPageShell
        table="COMPLEXITY"
        title="Complexity Mapping"
        description="Lower and Upper are complexity-index percentages. The engine maps the scored index into a T-Shirt, complexity label and governance outcome. Complexity dimensions and weights remain global."
        section="complexityMappings"
        columns={COLUMNS}
        globalRows={globalRows}
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
