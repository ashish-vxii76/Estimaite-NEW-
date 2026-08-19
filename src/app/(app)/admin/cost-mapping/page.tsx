import { getActiveConfig } from "@/services/configService";
import { GuardedMapping } from "@/components/admin/GuardedMapping";

export default async function CostMappingPage() {
  const config = await getActiveConfig();
  return (
    <GuardedMapping
      feature="config.rates"
      title="Cost Mapping"
      description="Location rate card. Daily rates are in the configured currency per resource-day and drive blended costing and resource-sprint economics."
      section="costMappings"
      rows={config.costMappings as unknown as Record<string, unknown>[]}
      columns={[
        { key: "location", label: "Location" },
        { key: "teamSprintCost", label: "Team Sprint Cost", type: "number" },
        { key: "resourceSprintCost", label: "Resource Sprint Cost", type: "number" },
        { key: "standardTeamSize", label: "Standard Team Size", type: "number" },
        { key: "currency", label: "Currency" },
      ]}
    />
  );
}
