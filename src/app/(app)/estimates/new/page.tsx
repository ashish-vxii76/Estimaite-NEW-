import { prisma } from "@/lib/prisma";
import { EstimateWizard } from "@/components/EstimateWizard";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { can } from "@/lib/access";
import { fromSession, teamsForUser } from "@/lib/scope";

export default async function NewEstimatePage() {
  const session = await auth();
  if (!can(session?.user.role, "estimates.create", "RW")) redirect("/home");
  const [teams, locations] = await Promise.all([
    teamsForUser(fromSession(session!.user)),
    prisma.location.findMany({ where: { active: true } }),
  ]);
  return (
    <EstimateWizard
      teams={teams}
      locations={locations}
      capabilities={{
        canEdit: true,
        canSubmit: can(session?.user.role, "estimates.submit", "RW"),
        canReview: false,
        canApprove: false,
        canOverride: can(session?.user.role, "estimates.edit", "RW"),
        teamLocked: session?.user.role !== "ADMINISTRATOR",
      }}
    />
  );
}
