import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { EstimateWizard } from "@/components/EstimateWizard";
import { toScenarioTeams } from "@/lib/scenarioTeams";
import { StatusBadge } from "@/components/ui";
import { can, writesOwnRecordsOnly } from "@/lib/access";
import { canSeeEstimateAsync, fromSession, teamsForUser } from "@/lib/scope";
import { resolveSeatLevel } from "@/services/orgService";
import { CREW_LEVEL } from "@/lib/orgLevel";
import { safeJsonParse } from "@/lib/safeJson";
import type { EstimateCalculationResult } from "@/domain/estimation";
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
  if (!(await canSeeEstimateAsync(fromSession(session!.user), estimate))) notFound();

  const ownOnly = writesOwnRecordsOnly(session?.user.role);
  const authored = estimate.createdById === session?.user.id;
  // What-if: Delivery Lead needs a Crew+ seat (Pod-level lead excluded); other roles by grant.
  const seatLevel = await resolveSeatLevel(fromSession(session!.user));
  const canWhatIfInteractive =
    can(session?.user.role, "whatIf", "RW") &&
    (session?.user.role !== "DELIVERY_LEAD" || seatLevel >= CREW_LEVEL);
  const canEdit =
    can(session?.user.role, "estimates.edit", "RW") && (!ownOnly || authored);

  const [teams, locations, config, orgUnits] = await Promise.all([
    teamsForUser(fromSession(session!.user)),
    prisma.location.findMany({ where: { active: true } }),
    getActiveConfig(),
    prisma.orgUnit.findMany({
      where: { active: true },
      select: { id: true, type: true, name: true, parentId: true },
    }),
  ]);
  const result = safeJsonParse<EstimateCalculationResult | null>(estimate.resultJson, null);
  // #15: flag when this estimate was computed under an older configuration version.
  const configStale = estimate.configurationVersionId !== config.versionId;
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
          {configStale ? (
            <span
              className="rounded-full border border-[var(--warn)] px-2.5 py-1 text-xs font-semibold text-[var(--warn)]"
              title="Computed under an earlier configuration version. Recalculate to use the current catalogues."
            >
              Config: stale
            </span>
          ) : null}
        </div>
      </div>
      <EstimateWizard
        estimateId={estimate.id}
        teams={teams}
        locations={locations}
        orgUnits={orgUnits}
        complexityDimensions={config.complexityDimensions}
        releaseQuarters={config.releaseQuarters}
        readinessCriteria={config.readinessCriteria}
        resourceLevels={config.resourceLevels}
        actuals={estimate.actuals}
        estimateStatus={estimate.status}
        descoped={estimate.descoped}
        scenarioTeams={toScenarioTeams(teams, locations)}
        savedScenario={savedScenario}
        capabilities={{
          canEdit,
          canSubmit: can(session?.user.role, "estimates.submit", "RW") && (!ownOnly || authored),
          canReview: can(session?.user.role, "estimates.review", "RW"),
          canApprove: can(session?.user.role, "estimates.approve", "RW"),
          canOverride: canEdit,
          canEditActuals: can(session?.user.role, "estimates.actuals", "RW"),
          canWhatIf: canWhatIfInteractive,
          canCancel: can(session?.user.role, "estimates.cancel", "RW"),
          canDescope: can(session?.user.role, "estimates.descope", "RW"),
          canRebaseline: can(session?.user.role, "estimates.rebaseline", "RW"),
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
