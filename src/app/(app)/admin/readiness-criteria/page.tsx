import { redirect } from "next/navigation";
import { getActiveConfig } from "@/services/configService";
import { ReadinessCriteriaEditor } from "@/components/admin/ReadinessCriteriaEditor";
import { auth } from "@/auth";
import { can } from "@/lib/access";

export default async function ReadinessCriteriaPage() {
  const session = await auth();
  if (!can(session?.user.role, "config.mappings")) redirect("/home");
  const config = await getActiveConfig();
  return (
    <ReadinessCriteriaEditor
      criteria={config.readinessCriteria}
      assumptionsMin={config.readinessAssumptionsMin}
      readOnly={!can(session?.user.role, "config.mappings", "RW")}
    />
  );
}
