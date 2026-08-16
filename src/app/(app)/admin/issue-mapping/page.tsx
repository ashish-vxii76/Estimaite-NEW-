import { getActiveConfig } from "@/services/configService";
import { MappingEditor } from "@/components/admin/MappingEditor";

export default async function IssueMappingPage() {
  const config = await getActiveConfig();
  return (
    <MappingEditor
      title="Issue Mapping"
      description="T-Shirt Size, Total SP, Dev SP, QA SP, Dev PD, QA PD, Total PD, Sprint Rule, Governance and Notes. Automated estimates read Dev/QA SP and governance from this table."
      section="issueMappings"
      rows={config.issueMappings as unknown as Record<string, unknown>[]}
      columns={[
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
      ]}
    />
  );
}
