import { getActiveConfig } from "@/services/configService";
import { ReadinessCriteriaEditor } from "@/components/admin/ReadinessCriteriaEditor";
import { auth } from "@/auth";
import { can } from "@/lib/access";

export default async function ReadinessCriteriaPage() {
  const session = await auth();
  const config = await getActiveConfig();
  return (
    <ReadinessCriteriaEditor
      criteria={config.readinessCriteria}
      assumptionsMin={config.readinessAssumptionsMin}
      readOnly={!can(session?.user.role, "config.mappings", "RW")}
    />
  );
}
