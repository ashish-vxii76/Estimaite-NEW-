import { Suspense } from "react";
import { auth } from "@/auth";
import { can } from "@/lib/access";
import { redirect } from "next/navigation";
import { loadMappingPageData } from "@/lib/mappingPageData";
import { MappingPageShell } from "@/components/admin/MappingPageShell";
import type { Column } from "@/components/admin/MappingEditor";

const COLUMNS: Column[] = [
  { key: "tshirt", label: "T-Shirt Size", type: "select", options: ["XS", "S", "M", "L", "XL", "XXL"] },
  { key: "romSp", label: "ROM SP", type: "number" },
  { key: "expectedStories", label: "Expected Stories", type: "number" },
  { key: "devSp", label: "Dev SP", type: "number" },
  { key: "qaSp", label: "QA SP", type: "number" },
  { key: "devPd", label: "Dev PD", type: "number" },
  { key: "qaPd", label: "QA PD", type: "number" },
  { key: "totalPd", label: "Total PD", type: "number" },
  {
    key: "governance",
    label: "Governance",
    type: "select",
    options: ["PLAN", "DECOMPOSE", "SPLIT EPIC", "READY", "REVIEW"],
  },
  { key: "notes", label: "Notes" },
];

export default async function EpicMappingPage({
  searchParams,
}: {
  searchParams: Promise<{ crew?: string }>;
}) {
  const session = await auth();
  const role = session?.user.role;
  if (!can(role, "config.mappings") && !can(role, "config.crewMappings")) redirect("/home");
  const { crew = "" } = await searchParams;
  const { scope, globalRows, override } = await loadMappingPageData(session!.user, "EPIC", crew);

  return (
    <Suspense fallback={<div className="text-sm text-[var(--muted)]">Loading…</div>}>
      <MappingPageShell
        table="EPIC"
        title="Epic Mapping"
        description="T-Shirt Size, ROM SP, Expected Stories, Dev SP, QA SP, Dev PD, QA PD, Total PD, Governance and Notes."
        section="epicMappings"
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
