import { prisma } from "@/lib/prisma";
import { EstimateWizard } from "@/components/EstimateWizard";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { can } from "@/lib/access";
import { fromSession, teamsForUser } from "@/lib/scope";
import { getActiveConfig } from "@/services/configService";

export default async function NewEstimatePage() {
  const session = await auth();
  if (!can(session?.user.role, "estimates.create", "RW")) redirect("/home");
  const [teams, locations, config] = await Promise.all([
    teamsForUser(fromSession(session!.user)),
    prisma.location.findMany({ where: { active: true } }),
    getActiveConfig(),
  ]);
  return (
    <EstimateWizard
      teams={teams}
      locations={locations}
      complexityDimensions={config.complexityDimensions}
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
