import { getActiveConfig } from "@/services/configService";
import { ComplexityDimensionsEditor } from "@/components/admin/ComplexityDimensionsEditor";
import { auth } from "@/auth";
import { can } from "@/lib/access";

export default async function ComplexityDimensionsPage() {
  const session = await auth();
  const config = await getActiveConfig();
  return (
    <ComplexityDimensionsEditor
      dimensions={config.complexityDimensions}
      readOnly={!can(session?.user.role, "config.mappings", "RW")}
    />
  );
}
