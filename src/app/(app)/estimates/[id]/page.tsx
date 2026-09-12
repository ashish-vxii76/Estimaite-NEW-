import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { EstimateWizard } from "@/components/EstimateWizard";
import { isGitlabIntakeEnabled } from "@/lib/features";
import { ResyncButton } from "@/components/intake/ResyncButton";
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

  // GitLab intake: additive provenance surface for agent-created drafts (flag-gated).
  const isAgentDraft = isGitlabIntakeEnabled() && estimate.origin === "AGENT";
  const provenance = isAgentDraft
    ? await prisma.estimateFieldProvenance.findMany({ where: { estimateId: id }, orderBy: { field: "asc" } })
    : [];
  const intakeGaps = provenance
    .filter((p) => (p.confidence ?? 0) < 0.5 || !p.evidence || /no ticket evidence/i.test(p.evidence ?? ""))
    .map((p) => p.field);
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
          {isAgentDraft ? (
            <span className="chip-warn rounded-full px-2.5 py-1 text-xs font-semibold">Agent draft</span>
          ) : null}
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

      {isAgentDraft ? (
        <section className="card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="kicker">Intake &amp; provenance</p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Drafted by the GitLab agent.
                {estimate.externalUrl ? (
                  <> <a className="underline" href={estimate.externalUrl} target="_blank" rel="noreferrer">Source ↗</a></>
                ) : null}
                {estimate.agentRunId ? (
                  <> · <Link className="underline" href={`/intake/runs/${estimate.agentRunId}`}>Import run</Link></>
                ) : null}
              </p>
            </div>
            {estimate.status === "DRAFT" ? <ResyncButton estimateId={estimate.id} /> : null}
          </div>

          {intakeGaps.length ? (
            <div className="mt-3 rounded-lg border border-[var(--warn)]/40 bg-[var(--panel-2)] p-3">
              <p className="text-sm font-semibold text-[var(--navy)]">Needs human input · {intakeGaps.length}</p>
              <p className="mt-1 text-xs text-[var(--muted)]">Confirm or edit before submitting: {intakeGaps.join(", ")}</p>
            </div>
          ) : provenance.length ? (
            <p className="mt-3 text-sm text-[var(--ok)]">All agent-proposed fields are evidence-backed.</p>
          ) : null}

          {provenance.length ? (
            <details className="mt-3">
              <summary className="cursor-pointer text-sm font-medium text-[var(--navy)]">
                Provenance · {provenance.length} field{provenance.length === 1 ? "" : "s"}
              </summary>
              <div className="mt-2 overflow-x-auto">
                <table className="w-full text-sm [&_td]:px-3 [&_td]:py-2 [&_th]:px-3 [&_th]:py-2">
                  <thead className="text-left text-xs uppercase tracking-wide text-[var(--muted)]">
                    <tr><th>Field</th><th>By</th><th>Confidence</th><th>Evidence</th></tr>
                  </thead>
                  <tbody>
                    {provenance.map((p) => (
                      <tr key={p.id} className="border-t border-[var(--line)]">
                        <td className="text-[var(--navy)]">{p.field}</td>
                        <td className="text-[var(--muted)]">{p.source}</td>
                        <td className="tabular-nums">{p.confidence != null ? `${Math.round(p.confidence * 100)}%` : "—"}</td>
                        <td className="max-w-[22rem] truncate text-xs text-[var(--muted)]" title={p.evidence ?? ""}>{p.evidence ?? ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          ) : null}
        </section>
      ) : null}

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
