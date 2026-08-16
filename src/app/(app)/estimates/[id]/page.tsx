import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { EstimateWizard } from "@/components/EstimateWizard";
import { ActualsForm } from "@/components/ActualsForm";
import { StatusBadge } from "@/components/ui";

export default async function EstimateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
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
  const [teams, locations] = await Promise.all([
    prisma.team.findMany({ where: { active: true } }),
    prisma.location.findMany({ where: { active: true } }),
  ]);
  const result = estimate.resultJson ? JSON.parse(estimate.resultJson) : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs text-[var(--muted)]">{estimate.reference}</p>
          <h1 className="text-2xl font-semibold">{estimate.title}</h1>
        </div>
        <StatusBadge status={estimate.status} />
      </div>
      <EstimateWizard
        estimateId={estimate.id}
        teams={teams}
        locations={locations}
        initial={{
          ...estimate,
          result,
          complexityScores: JSON.parse(estimate.complexityScoresJson),
          readiness: JSON.parse(estimate.readinessJson),
        }}
      />
      <ActualsForm estimateId={estimate.id} actuals={estimate.actuals} />
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
