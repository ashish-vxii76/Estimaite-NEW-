import { redirect } from "next/navigation";
import { getActiveConfig } from "@/services/configService";
import { ComplexityDimensionsEditor } from "@/components/admin/ComplexityDimensionsEditor";
import { auth } from "@/auth";
import { can } from "@/lib/access";

export default async function ComplexityDimensionsPage() {
  const session = await auth();
  if (!can(session?.user.role, "config.mappings")) redirect("/home");
  const config = await getActiveConfig();
  return (
    <ComplexityDimensionsEditor
      dimensions={config.complexityDimensions}
      readOnly={!can(session?.user.role, "config.mappings", "RW")}
    />
  );
}
