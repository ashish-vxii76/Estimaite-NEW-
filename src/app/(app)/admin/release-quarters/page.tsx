import { redirect } from "next/navigation";
import { getActiveConfig } from "@/services/configService";
import { ReleaseQuartersEditor } from "@/components/admin/ReleaseQuartersEditor";
import { auth } from "@/auth";
import { can } from "@/lib/access";

export default async function ReleaseQuartersPage() {
  const session = await auth();
  if (!can(session?.user.role, "config.mappings")) redirect("/home");
  const config = await getActiveConfig();
  return (
    <ReleaseQuartersEditor
      quarters={config.releaseQuarters}
      readOnly={!can(session?.user.role, "config.mappings", "RW")}
    />
  );
}
