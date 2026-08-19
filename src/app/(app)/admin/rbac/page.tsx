import { auth } from "@/auth";
import { RbacEditor } from "@/components/admin/RbacEditor";
import { can } from "@/lib/access";
import { getRbacMatrix } from "@/services/rbacService";

export default async function RbacPage() {
  const session = await auth();
  const matrix = await getRbacMatrix();
  return (
    <RbacEditor
      initial={matrix}
      canEdit={can(session?.user.role, "config.rbac", "RW")}
    />
  );
}
