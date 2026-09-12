import { prisma } from "@/lib/prisma";
import { createEstimate, calculateAndPersist, estimateInputSchema } from "@/services/estimateService";
import { clientForUser } from "./intake";
import { parseExternalRef } from "./refs";
import type { GitlabCandidate } from "./client";

/**
 * E6/E7 — deterministic ingest runner. Processes a QUEUED ImportRun in batches: for each SELECTED
 * ticket it fetches the GitLab item, maps the KNOWN fields, and creates a DRAFT estimate through the
 * existing engine (calculateAndPersist) — no engine/config changes, no agent yet (that's E8).
 * Idempotent + resumable: only PENDING items are processed; an externalRef that already has an
 * estimate links as DUPLICATE and is never re-created (PRD §8.4 F11).
 */

const BATCH_SIZE = 5;

/** Pure: map a GitLab ticket + context to the KNOWN estimate inputs. Engine defaults fill the rest. */
export function ticketToEstimateInput(
  ticket: Pick<GitlabCandidate, "type" | "iid" | "title" | "description">,
  ctx: { teamId: string; reference: string; requester: string; release?: string | null; currency?: string },
): Record<string, unknown> {
  return {
    workItemType: ticket.type,
    reference: ctx.reference,
    title: ticket.title?.trim() || `${ticket.type} ${ticket.iid}`,
    description: ticket.description ?? "",
    teamId: ctx.teamId,
    requester: ctx.requester,
    ...(ctx.release ? { release: ctx.release } : {}),
    ...(ctx.currency ? { currency: ctx.currency } : {}),
  };
}

async function nextReference(): Promise<string> {
  const refs = await prisma.estimate.findMany({ select: { reference: true } });
  const max = refs.reduce((m, r) => {
    const mt = /^CR-(\d+)$/.exec(r.reference?.trim() ?? "");
    return mt ? Math.max(m, Number(mt[1])) : m;
  }, 0);
  return `CR-${String(max + 1).padStart(6, "0")}`;
}

async function resolveDraftTeam(run: { podTeamId: string | null; sourceMappingId: string; crewId: string }): Promise<string | null> {
  if (run.podTeamId) return run.podTeamId;
  const m = await prisma.gitLabSourceMapping.findUnique({ where: { id: run.sourceMappingId }, select: { defaultPodTeamId: true } });
  if (m?.defaultPodTeamId) return m.defaultPodTeamId;
  const t = await prisma.team.findFirst({ where: { active: true, crewId: run.crewId }, select: { id: true }, orderBy: { name: "asc" } });
  return t?.id ?? null;
}

export async function processImportRun(runId: string): Promise<{ ok: boolean; message: string }> {
  const run = await prisma.importRun.findUnique({ where: { id: runId }, include: { sourceMapping: true, items: true } });
  if (!run) return { ok: false, message: "Run not found." };
  if (run.status === "COMPLETED") return { ok: true, message: "Already complete." };

  const client = await clientForUser(run.triggeredById);
  if (!client) {
    await prisma.importRun.update({ where: { id: runId }, data: { status: "FAILED", error: "No GitLab connection for the triggering user.", completedAt: new Date() } });
    return { ok: false, message: "No GitLab connection for the triggering user." };
  }

  await prisma.importRun.update({ where: { id: runId }, data: { status: "IN_PROGRESS", startedAt: run.startedAt ?? new Date() } });

  const teamId = await resolveDraftTeam(run);
  const trigger = await prisma.user.findUnique({ where: { id: run.triggeredById }, select: { name: true, email: true } });
  const team = teamId ? await prisma.team.findUnique({ where: { id: teamId }, select: { currency: true } }) : null;
  const requester = trigger?.name || trigger?.email || "GitLab import";

  const pending = run.items.filter((i) => i.status === "PENDING");
  let processed = run.processed;
  let errors = 0;

  for (let start = 0; start < pending.length; start += BATCH_SIZE) {
    const batch = pending.slice(start, start + BATCH_SIZE);
    for (const item of batch) {
      try {
        // Idempotency: never re-create an already-linked ticket.
        const existing = await prisma.estimate.findUnique({ where: { externalRef: item.externalRef }, select: { id: true } });
        if (existing) {
          await prisma.importItem.update({ where: { id: item.id }, data: { status: "DUPLICATE", estimateId: existing.id, error: null } });
        } else {
          if (!teamId) throw new Error("No pod/team available to draft into (map a default pod).");
          const p = parseExternalRef(item.externalRef);
          const type = p?.type ?? "ISSUE";
          const ticket = type === "EPIC"
            ? await client.getEpic(run.sourceMapping.projectOrGroupRef, item.gitlabIid)
            : await client.getIssue(run.sourceMapping.projectOrGroupRef, item.gitlabIid);

          const data = estimateInputSchema.parse(
            ticketToEstimateInput(ticket, {
              teamId,
              reference: await nextReference(),
              requester,
              release: run.defaultReleaseQuarter,
              currency: team?.currency,
            }),
          );
          const est = await createEstimate(data, run.triggeredById);
          await prisma.estimate.update({
            where: { id: est.id },
            data: { origin: "AGENT", externalRef: item.externalRef, externalUrl: ticket.webUrl || null, agentRunId: run.id },
          });
          await calculateAndPersist(est.id, run.triggeredById);
          await prisma.importItem.update({ where: { id: item.id }, data: { status: "DRAFTED", estimateId: est.id, error: null } });
        }
      } catch (e) {
        errors += 1;
        await prisma.importItem.update({ where: { id: item.id }, data: { status: "ERROR", error: (e instanceof Error ? e.message : "Failed").slice(0, 300) } });
      }
      processed += 1;
      await prisma.importRun.update({ where: { id: runId }, data: { processed } });
    }
  }

  const status = errors === 0 ? "COMPLETED" : errors < pending.length ? "PARTIAL" : "FAILED";
  await prisma.importRun.update({
    where: { id: runId },
    data: { status, completedAt: new Date(), error: errors ? `${errors} item(s) errored` : null },
  });
  return { ok: true, message: `Processed ${processed}; ${errors} error(s).` };
}
