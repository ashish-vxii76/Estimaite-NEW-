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
