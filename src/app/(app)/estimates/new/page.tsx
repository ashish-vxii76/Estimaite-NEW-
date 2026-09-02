import { prisma } from "@/lib/prisma";
import { EstimateWizard } from "@/components/EstimateWizard";
import { toScenarioTeams } from "@/lib/scenarioTeams";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { can } from "@/lib/access";
import { fromSession, teamsForUser } from "@/lib/scope";
import { getActiveConfig } from "@/services/configService";

export default async function NewEstimatePage() {
  const session = await auth();
  if (!can(session?.user.role, "estimates.create", "RW")) redirect("/home");
  const [teams, locations, config, orgUnits, refs] = await Promise.all([
    teamsForUser(fromSession(session!.user)),
    prisma.location.findMany({ where: { active: true } }),
    getActiveConfig(),
    prisma.orgUnit.findMany({
      where: { active: true },
      select: { id: true, type: true, name: true, parentId: true },
    }),
    prisma.estimate.findMany({ select: { reference: true } }),
  ]);

  // Next sequential CR-###### based on the highest existing CR number in the system.
  const maxCr = refs.reduce((max, r) => {
    const m = /^CR-(\d+)$/.exec(r.reference?.trim() ?? "");
    return m ? Math.max(max, Number(m[1])) : max;
  }, 0);
  const nextReference = `CR-${String(maxCr + 1).padStart(6, "0")}`;
  return (
    <EstimateWizard
      teams={teams}
      locations={locations}
      orgUnits={orgUnits}
      requesterName={session?.user.name ?? session?.user.email ?? ""}
      nextReference={nextReference}
      complexityDimensions={config.complexityDimensions}
      releaseQuarters={config.releaseQuarters}
      readinessCriteria={config.readinessCriteria}
      resourceLevels={config.resourceLevels}
      scenarioTeams={toScenarioTeams(teams, locations)}
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
