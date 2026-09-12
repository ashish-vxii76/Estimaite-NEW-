import { prisma } from "@/lib/prisma";
import { adminVisibleCrewIds } from "@/services/orgService";
import type { ScopeUser } from "@/lib/scope";
import { decryptSecret } from "@/lib/crypto";
import { GitLabClient } from "./client";

/**
 * Server-only helpers for the GitLab integration (connection + source mapping). The decrypted PAT
 * never leaves this module boundary — only a live client or a status object is returned.
 */

export type ConnectionStatus = {
  connected: boolean;
  host?: string;
  status?: string;
  scopes?: string;
  lastUsedAt?: Date | null;
};

export async function getConnectionStatus(userId: string): Promise<ConnectionStatus> {
  const c = await prisma.gitLabConnection.findFirst({ where: { userId } });
  if (!c) return { connected: false };
  return { connected: c.status === "ACTIVE", host: c.host, status: c.status, scopes: c.scopes, lastUsedAt: c.lastUsedAt };
}

/** Live client for the user's stored PAT (decrypted server-side). Null when no ACTIVE connection. */
export async function clientForUser(userId: string): Promise<GitLabClient | null> {
  const c = await prisma.gitLabConnection.findFirst({ where: { userId, status: "ACTIVE" } });
  if (!c) return null;
  return new GitLabClient(c.host, decryptSecret(c.encToken));
}

export type CrewOption = { id: string; name: string };
export type PodOption = { id: string; name: string; crewId: string | null };

/** Crews the user may map a source to = their admin scope (null from the service = all crews). */
export async function configurableCrews(user: ScopeUser): Promise<CrewOption[]> {
  const ids = await adminVisibleCrewIds(user);
  return prisma.orgUnit.findMany({
    where: { type: "CREW", active: true, ...(ids ? { id: { in: ids } } : {}) },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

export async function podsForCrews(crewIds: string[]): Promise<PodOption[]> {
  if (crewIds.length === 0) return [];
  return prisma.team.findMany({
    where: { active: true, crewId: { in: crewIds } },
    select: { id: true, name: true, crewId: true },
    orderBy: { name: "asc" },
  });
}

/** True when the user may configure a mapping for this crew (in their admin scope). */
export async function canConfigureCrew(user: ScopeUser, crewId: string): Promise<boolean> {
  const ids = await adminVisibleCrewIds(user);
  return ids == null || ids.includes(crewId);
}

export type MappingRow = {
  id: string;
  host: string;
  projectOrGroupRef: string;
  crewId: string;
  crewName: string;
  defaultPodTeamId: string | null;
  defaultPodName: string | null;
  enabled: boolean;
};

export async function listMappings(user: ScopeUser): Promise<MappingRow[]> {
  const ids = await adminVisibleCrewIds(user);
  const rows = await prisma.gitLabSourceMapping.findMany({
    where: ids ? { crewId: { in: ids } } : {},
    orderBy: { createdAt: "desc" },
  });
  const crewIds = [...new Set(rows.map((r) => r.crewId))];
  const podIds = rows.map((r) => r.defaultPodTeamId).filter((x): x is string => Boolean(x));
  const [crews, pods] = await Promise.all([
    prisma.orgUnit.findMany({ where: { id: { in: crewIds } }, select: { id: true, name: true } }),
    prisma.team.findMany({ where: { id: { in: podIds } }, select: { id: true, name: true } }),
  ]);
  const crewName = Object.fromEntries(crews.map((c) => [c.id, c.name]));
  const podName = Object.fromEntries(pods.map((p) => [p.id, p.name]));
  return rows.map((r) => ({
    id: r.id,
    host: r.host,
    projectOrGroupRef: r.projectOrGroupRef,
    crewId: r.crewId,
    crewName: crewName[r.crewId] ?? "—",
    defaultPodTeamId: r.defaultPodTeamId,
    defaultPodName: r.defaultPodTeamId ? podName[r.defaultPodTeamId] ?? null : null,
    enabled: r.enabled,
  }));
}

// ─── Pull / preview / run (E5) ───────────────────────────────────────────────────────────────────
import { externalRef, parseExternalRef, type GitlabItemType } from "./refs";
import type { GitlabCandidate } from "./client";

export type PullFilters = { type?: GitlabItemType; state?: string; labels?: string; showImported?: boolean };
export type PreviewCandidate = GitlabCandidate & { externalRef: string; alreadyImported: boolean };

/** Crews the user may PULL from: app-admin=all(null); crew-leadership=their admin crews; else pod→its crew. */
export async function pullableCrewIds(user: ScopeUser): Promise<string[] | null> {
  const adminCrews = await adminVisibleCrewIds(user);
  if (adminCrews === null) return null; // app admin → all
  if (adminCrews.length > 0) return adminCrews; // crew-leadership scope
  if (user.teamId) {
    const team = await prisma.team.findUnique({ where: { id: user.teamId }, select: { crewId: true } });
    return team?.crewId ? [team.crewId] : [];
  }
  return [];
}

export async function pullableSources(user: ScopeUser): Promise<MappingRow[]> {
  const ids = await pullableCrewIds(user);
  const rows = await prisma.gitLabSourceMapping.findMany({
    where: { enabled: true, ...(ids ? { crewId: { in: ids } } : {}) },
    orderBy: { projectOrGroupRef: "asc" },
  });
  const crews = await prisma.orgUnit.findMany({ where: { id: { in: [...new Set(rows.map((r) => r.crewId))] } }, select: { id: true, name: true } });
  const crewName = Object.fromEntries(crews.map((c) => [c.id, c.name]));
  return rows.map((r) => ({
    id: r.id, host: r.host, projectOrGroupRef: r.projectOrGroupRef, crewId: r.crewId,
    crewName: crewName[r.crewId] ?? "—", defaultPodTeamId: r.defaultPodTeamId, defaultPodName: null, enabled: r.enabled,
  }));
}

/** Pure: split candidates into visible vs hidden by already-imported (has a linked estimate). */
export function partitionCandidates(
  raw: GitlabCandidate[],
  host: string,
  imported: Set<string>,
  showImported: boolean,
): { visible: PreviewCandidate[]; hidden: number } {
  const visible: PreviewCandidate[] = [];
  let hidden = 0;
  for (const c of raw) {
    const ref = externalRef(host, c.projectId, c.type, c.iid);
    const already = imported.has(ref);
    if (already && !showImported) { hidden += 1; continue; }
    visible.push({ ...c, externalRef: ref, alreadyImported: already });
  }
  return { visible, hidden };
}

export async function previewCandidates(
  user: ScopeUser,
  mappingId: string,
  filters: PullFilters,
): Promise<{ candidates: PreviewCandidate[]; hiddenImported: number; error?: string }> {
  const ids = await pullableCrewIds(user);
  const m = await prisma.gitLabSourceMapping.findUnique({ where: { id: mappingId } });
  if (!m || !m.enabled) return { candidates: [], hiddenImported: 0, error: "Source not available." };
  if (ids !== null && !ids.includes(m.crewId)) return { candidates: [], hiddenImported: 0, error: "Source is outside your scope." };
  const client = await clientForUser(user.id);
  if (!client) return { candidates: [], hiddenImported: 0, error: "Connect your GitLab account first." };

  const type: GitlabItemType = filters.type ?? "ISSUE";
  let raw: GitlabCandidate[];
  try {
    raw = type === "EPIC"
      ? await client.listEpics(m.projectOrGroupRef, filters)
      : await client.listIssues(m.projectOrGroupRef, filters);
  } catch (e) {
    return { candidates: [], hiddenImported: 0, error: e instanceof Error ? e.message : "GitLab request failed." };
  }
  const refs = raw.map((c) => externalRef(m.host, c.projectId, c.type, c.iid));
  const importedRows = await prisma.estimate.findMany({ where: { externalRef: { in: refs } }, select: { externalRef: true } });
  const imported = new Set(importedRows.map((e) => e.externalRef).filter((x): x is string => Boolean(x)));
  const { visible, hidden } = partitionCandidates(raw, m.host, imported, filters.showImported ?? false);
  return { candidates: visible, hiddenImported: hidden };
}

export async function createImportRun(
  user: ScopeUser,
  input: { mappingId: string; filters: PullFilters; selectedRefs: string[]; defaultReleaseQuarter?: string | null },
): Promise<{ ok: boolean; runId?: string; message: string }> {
  const ids = await pullableCrewIds(user);
  const m = await prisma.gitLabSourceMapping.findUnique({ where: { id: input.mappingId } });
  if (!m || !m.enabled) return { ok: false, message: "Source not available." };
  if (ids !== null && !ids.includes(m.crewId)) return { ok: false, message: "Source is outside your scope." };
  const selected = [...new Set(input.selectedRefs ?? [])].filter(Boolean);
  if (selected.length === 0) return { ok: false, message: "Select at least one ticket." };

  // Pod-level trigger → bind drafts to the triggerer's pod (PRD §5.2).
  const adminCrews = await adminVisibleCrewIds(user);
  const isPodLevel = adminCrews !== null && adminCrews.length === 0;
  const podTeamId = isPodLevel && user.teamId ? user.teamId : m.defaultPodTeamId ?? null;

  const run = await prisma.importRun.create({
    data: {
      sourceMappingId: m.id,
      triggeredById: user.id,
      crewId: m.crewId,
      podTeamId,
      status: "QUEUED",
      total: selected.length,
      processed: 0,
      filtersJson: JSON.stringify(input.filters ?? {}),
      selectedRefsJson: JSON.stringify(selected),
      defaultReleaseQuarter: input.defaultReleaseQuarter ?? null,
      items: {
        create: selected.map((ref) => {
          const p = parseExternalRef(ref);
          return { gitlabType: p?.type ?? "ISSUE", gitlabIid: p?.iid ?? "", externalRef: ref, status: "PENDING" };
        }),
      },
    },
  });
  return { ok: true, runId: run.id, message: `Queued ${selected.length} item(s) for import.` };
}

export type RunRow = {
  id: string; status: string; total: number; processed: number;
  source: string; crewName: string; createdAt: Date; triggeredBy: string;
};

export async function listRuns(user: ScopeUser): Promise<RunRow[]> {
  const ids = await pullableCrewIds(user);
  const runs = await prisma.importRun.findMany({
    where: ids ? { crewId: { in: ids } } : {},
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { sourceMapping: true, triggeredBy: { select: { name: true } } },
  });
  const crews = await prisma.orgUnit.findMany({ where: { id: { in: [...new Set(runs.map((r) => r.crewId))] } }, select: { id: true, name: true } });
  const crewName = Object.fromEntries(crews.map((c) => [c.id, c.name]));
  return runs.map((r) => ({
    id: r.id, status: r.status, total: r.total, processed: r.processed,
    source: r.sourceMapping.projectOrGroupRef, crewName: crewName[r.crewId] ?? "—",
    createdAt: r.createdAt, triggeredBy: r.triggeredBy.name,
  }));
}

export type RunItemRow = {
  id: string; gitlabType: string; gitlabIid: string; status: string;
  estimateId: string | null; estimateRef: string | null; error: string | null;
};
export type RunDetail = {
  id: string; status: string; total: number; processed: number;
  source: string; crewName: string; defaultReleaseQuarter: string | null; items: RunItemRow[];
} | null;

export async function getRunDetail(user: ScopeUser, runId: string): Promise<RunDetail> {
  const ids = await pullableCrewIds(user);
  const run = await prisma.importRun.findUnique({
    where: { id: runId },
    include: { sourceMapping: true, items: { include: { estimate: { select: { reference: true } } }, orderBy: { createdAt: "asc" } } },
  });
  if (!run) return null;
  if (ids !== null && !ids.includes(run.crewId)) return null;
  const crew = await prisma.orgUnit.findUnique({ where: { id: run.crewId }, select: { name: true } });
  return {
    id: run.id, status: run.status, total: run.total, processed: run.processed,
    source: run.sourceMapping.projectOrGroupRef, crewName: crew?.name ?? "—",
    defaultReleaseQuarter: run.defaultReleaseQuarter,
    items: run.items.map((i) => ({
      id: i.id, gitlabType: i.gitlabType, gitlabIid: i.gitlabIid, status: i.status,
      estimateId: i.estimateId, estimateRef: i.estimate?.reference ?? null, error: i.error,
    })),
  };
}
