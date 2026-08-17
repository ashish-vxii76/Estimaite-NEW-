import { getActiveConfig } from "@/services/configService";
import { EstimationConfigForm } from "@/components/admin/EstimationConfigForm";
import { auth } from "@/auth";
import { can } from "@/lib/access";

export default async function EstimationConfigPage() {
  const session = await auth();
  const config = await getActiveConfig();
  return (
    <EstimationConfigForm
      config={config}
      readOnly={!can(session?.user.role, "config.mappings", "RW")}
    />
  );
}
