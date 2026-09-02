import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { RbacEditor } from "@/components/admin/RbacEditor";
import { can } from "@/lib/access";
import { getRbacMatrix } from "@/services/rbacService";

export default async function RbacPage() {
  const session = await auth();
  // DEC-016: the RBAC matrix is App-Admin only. Deny read by default (hiding the menu is not enough).
  if (!can(session?.user.role, "config.rbac")) redirect("/home");
  const matrix = await getRbacMatrix();
  return (
    <RbacEditor
      initial={matrix}
      canEdit={can(session?.user.role, "config.rbac", "RW")}
    />
  );
}
