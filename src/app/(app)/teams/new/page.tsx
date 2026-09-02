import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { NewTeamForm } from "@/components/NewTeamForm";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/access";

export default async function NewTeamPage() {
  const session = await auth();
  if (!can(session?.user.role, "config.teams", "RW")) redirect("/home");
  const crews = await prisma.orgUnit.findMany({
    where: { type: "CREW", active: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  return <NewTeamForm crews={crews} />;
}
