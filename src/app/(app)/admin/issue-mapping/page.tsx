import { Suspense } from "react";
import { auth } from "@/auth";
import { can } from "@/lib/access";
import { redirect } from "next/navigation";
import { loadMappingPageData } from "@/lib/mappingPageData";
import { MappingPageShell } from "@/components/admin/MappingPageShell";
import type { Column } from "@/components/admin/MappingEditor";

const COLUMNS: Column[] = [
  { key: "tshirt", label: "T-Shirt Size", type: "select", options: ["XS", "S", "M", "L", "XL", "XXL"] },
  { key: "totalSp", label: "Total SP", type: "number" },
  { key: "devSp", label: "Dev SP", type: "number" },
  { key: "qaSp", label: "QA SP", type: "number" },
  { key: "devPd", label: "Dev PD", type: "number" },
  { key: "qaPd", label: "QA PD", type: "number" },
  { key: "totalPd", label: "Total PD", type: "number" },
  { key: "sprintRule", label: "Sprint Rule" },
  {
    key: "governance",
    label: "Governance",
    type: "select",
    options: ["READY", "REVIEW", "SPLIT", "PLAN", "DECOMPOSE", "SPLIT EPIC"],
  },
  { key: "notes", label: "Notes" },
];

export default async function IssueMappingPage({
  searchParams,
}: {
  searchParams: Promise<{ crew?: string }>;
}) {
  const session = await auth();
  const role = session?.user.role;
  if (!can(role, "config.mappings") && !can(role, "config.crewMappings")) redirect("/home");
  const { crew = "" } = await searchParams;
  const { scope, globalRows, override } = await loadMappingPageData(session!.user, "ISSUE", crew);

  return (
    <Suspense fallback={<div className="text-sm text-[var(--muted)]">Loading…</div>}>
      <MappingPageShell
        table="ISSUE"
        title="Issue Mapping"
        description="T-Shirt Size, Total SP, Dev SP, QA SP, Dev PD, QA PD, Total PD, Sprint Rule, Governance and Notes. Automated estimates read Dev/QA SP and governance from this table."
        section="issueMappings"
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
