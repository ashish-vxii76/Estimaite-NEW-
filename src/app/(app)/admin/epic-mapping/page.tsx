import { getActiveConfig } from "@/services/configService";
import { GuardedMapping } from "@/components/admin/GuardedMapping";

export default async function EpicMappingPage() {
  const config = await getActiveConfig();
  return (
    <GuardedMapping
      title="Epic Mapping"
      description="T-Shirt Size, ROM SP, Expected Stories, Dev SP, QA SP, Dev PD, QA PD, Total PD, Governance and Notes."
      section="epicMappings"
      rows={config.epicMappings as unknown as Record<string, unknown>[]}
      columns={[
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
      ]}
    />
  );
}
