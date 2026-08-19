import { getActiveConfig } from "@/services/configService";
import { GuardedMapping } from "@/components/admin/GuardedMapping";

export default async function ResourceMappingPage() {
  const config = await getActiveConfig();
  return (
    <GuardedMapping
      title="Resource Mapping"
      description="Resource Level, SP Capacity / Sprint, Days per Point, Definition and Rule. Capacity feeds planning; days/point feeds resource-aware effort."
      section="resourceLevels"
      rows={config.resourceLevels as unknown as Record<string, unknown>[]}
      columns={[
        { key: "id", label: "Level ID" },
        { key: "name", label: "Resource Level" },
        { key: "capacitySpPerSprint", label: "SP Capacity / Sprint", type: "number" },
        { key: "daysPerPoint", label: "Days / Point", type: "number" },
        { key: "definition", label: "Definition" },
        { key: "rule", label: "Rule" },
      ]}
    />
  );
}
