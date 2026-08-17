import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { UsersAdmin } from "@/components/admin/UsersAdmin";

export default async function UsersPage() {
  const session = await auth();
  if (session?.user.role !== "ADMINISTRATOR") redirect("/");
  const users = await prisma.user.findMany({
    orderBy: { name: "asc" },
    select: { id: true, email: true, name: true, role: true, active: true },
  });
  return <UsersAdmin initial={users} />;
}
