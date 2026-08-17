import { prisma } from "@/lib/prisma";
import { EstimateWizard } from "@/components/EstimateWizard";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { ESTIMATE_CREATE_ROLES, hasRole } from "@/lib/roles";

export default async function NewEstimatePage() {
  const session = await auth();
  if (!hasRole(session?.user.role, ESTIMATE_CREATE_ROLES)) redirect("/");
  const [teams, locations] = await Promise.all([
    prisma.team.findMany({ where: { active: true } }),
    prisma.location.findMany({ where: { active: true } }),
  ]);
  return <EstimateWizard teams={teams} locations={locations} />;
}
