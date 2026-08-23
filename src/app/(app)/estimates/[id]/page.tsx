import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { EstimateWizard } from "@/components/EstimateWizard";
import { toScenarioTeams } from "@/lib/scenarioTeams";
import { StatusBadge } from "@/components/ui";
import { can, writesOwnRecordsOnly } from "@/lib/access";
import { canSeeEstimate, fromSession, teamsForUser } from "@/lib/scope";
import { getActiveConfig } from "@/services/configService";

export default async function EstimateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const { id } = await params;
  const estimate = await prisma.estimate.findUnique({
    where: { id },
    include: {
      team: true,
      auditEvents: { orderBy: { createdAt: "desc" }, take: 30 },
      approvals: { orderBy: { createdAt: "desc" } },
      actuals: true,
    },
  });
  if (!estimate) notFound();
  if (!canSeeEstimate(fromSession(session!.user), estimate)) notFound();

  const ownOnly = writesOwnRecordsOnly(session?.user.role);
  const authored = estimate.createdById === session?.user.id;
  const canEdit =
    can(session?.user.role, "estimates.edit", "RW") && (!ownOnly || authored);

  const [teams, locations, config] = await Promise.all([
    teamsForUser(fromSession(session!.user)),
    prisma.location.findMany({ where: { active: true } }),
    getActiveConfig(),
  ]);
  const result = estimate.resultJson ? JSON.parse(estimate.resultJson) : null;
  let savedScenario = null;
  if (estimate.scenarioJson) {
    try {
      savedScenario = JSON.parse(estimate.scenarioJson);
    } catch {
      savedScenario = null;
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="kicker">{estimate.reference}</p>
          <h1 className="font-display text-2xl font-semibold text-[var(--navy)]">{estimate.title}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={estimate.status} />
          {result?.deliveryFlag ? <StatusBadge status={result.deliveryFlag} /> : null}
        </div>
      </div>
      <EstimateWizard
        estimateId={estimate.id}
        teams={teams}
        locations={locations}
        complexityDimensions={config.complexityDimensions}
        releaseQuarters={config.releaseQuarters}
        readinessCriteria={config.readinessCriteria}
        resourceLevels={config.resourceLevels}
        actuals={estimate.actuals}
        estimateStatus={estimate.status}
        scenarioTeams={toScenarioTeams(teams, locations)}
        savedScenario={savedScenario}
        capabilities={{
          canEdit,
          canSubmit: can(session?.user.role, "estimates.submit", "RW") && (!ownOnly || authored),
          canReview: can(session?.user.role, "estimates.review", "RW"),
          canApprove: can(session?.user.role, "estimates.approve", "RW"),
          canOverride: canEdit,
          canEditActuals: can(session?.user.role, "estimates.actuals", "RW"),
          canWhatIf: can(session?.user.role, "whatIf", "RW"),
          teamLocked: session?.user.role !== "ADMINISTRATOR",
        }}
        initial={{
          ...estimate,
          result,
          complexityScores: JSON.parse(estimate.complexityScoresJson),
          readiness: JSON.parse(estimate.readinessJson),
        }}
      />
      <section className="card p-5">
        <h2 className="font-medium">Audit history</h2>
        <ul className="mt-3 space-y-2 text-sm text-[var(--muted)]">
          {estimate.auditEvents.map((event) => (
            <li key={event.id}>
              {event.createdAt.toISOString()} — {event.action}
              {event.newValue ? `: ${event.newValue}` : ""}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
