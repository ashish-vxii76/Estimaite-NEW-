import { getActiveConfig } from "@/services/configService";
import { MappingEditor } from "@/components/admin/MappingEditor";

export default async function TeamCostMappingPage() {
  const config = await getActiveConfig();
  return (
    <MappingEditor
      title="Team Cost Mapping"
      description="Team Location, Team Name, Cost Method, Cost, Standard Team Size and Currency. Team Sprint Rate is not prorated unless a commercial policy says so."
      section="teamCostMappings"
      rows={config.teamCostMappings as unknown as Record<string, unknown>[]}
      columns={[
        { key: "teamLocation", label: "Team Location" },
        { key: "teamName", label: "Team Name" },
        { key: "teamSprintCost", label: "Team Sprint Cost", type: "number" },
        { key: "resourceSprintCost", label: "Resource Sprint Cost", type: "number" },
        { key: "standardTeamSize", label: "Standard Team Size", type: "number" },
        { key: "currency", label: "Currency" },
      ]}
    />
  );
}
