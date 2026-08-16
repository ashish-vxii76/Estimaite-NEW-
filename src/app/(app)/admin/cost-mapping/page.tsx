import { getActiveConfig } from "@/services/configService";
import { MappingEditor } from "@/components/admin/MappingEditor";

export default async function CostMappingPage() {
  const config = await getActiveConfig();
  return (
    <MappingEditor
      title="Cost Mapping"
      description="Location rate card. Daily rates are in the configured currency per resource-day and drive blended costing and resource-sprint economics."
      section="costMappings"
      rows={config.costMappings as unknown as Record<string, unknown>[]}
      columns={[
        { key: "location", label: "Location" },
        { key: "costMethod", label: "Cost Method" },
        { key: "cost", label: "Cost", type: "number" },
        { key: "standardTeamSize", label: "Standard Team Size", type: "number" },
        { key: "currency", label: "Currency" },
      ]}
    />
  );
}
