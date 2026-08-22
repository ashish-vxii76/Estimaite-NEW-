import { prisma } from "@/lib/prisma";
import { EstimateWizard } from "@/components/EstimateWizard";
import { toScenarioTeams } from "@/components/WhatIfForm";
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
      releaseQuarters={config.releaseQuarters}
      readinessCriteria={config.readinessCriteria}
      resourceLevels={config.resourceLevels}
      scenarioTeams={toScenarioTeams(teams)}
      capabilities={{
        canEdit: true,
        canSubmit: can(session?.user.role, "estimates.submit", "RW"),
        canReview: false,
        canApprove: false,
        canOverride: can(session?.user.role, "estimates.edit", "RW"),
        canEditActuals: can(session?.user.role, "estimates.actuals", "RW"),
        canWhatIf: can(session?.user.role, "whatIf", "RW"),
        teamLocked: session?.user.role !== "ADMINISTRATOR",
      }}
    />
  );
}
