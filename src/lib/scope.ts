import { prisma } from "@/lib/prisma";
import { seesAllTeams } from "@/lib/access";
import { visibleTeamIds } from "@/services/orgService";
import type { Prisma } from "@prisma/client";

export type ScopeUser = {
  id: string;
  role: string;
  teamId?: string | null;
};

export function fromSession(user: {
  id: string;
  role: string;
  teamId?: string | null;
}): ScopeUser {
  return { id: user.id, role: user.role, teamId: user.teamId ?? null };
}

/** Legacy sync scope (pod teamId only). Prefer resolveEstimateScope. */
export function estimateScope(user: ScopeUser): Prisma.EstimateWhereInput {
  if (seesAllTeams(user.role)) return {};
  if (!user.teamId) return { id: "__none__" };
  return { teamId: user.teamId };
}

/** Org-aware estimate scope: subtree of primary seat, else legacy team. */
export async function resolveEstimateScope(user: ScopeUser): Promise<Prisma.EstimateWhereInput> {
  if (seesAllTeams(user.role)) return {};
  const teamIds = await visibleTeamIds(user);
  if (teamIds == null) return {};
  if (teamIds.length === 0) {
    if (!user.teamId) return { id: "__none__" };
    return { teamId: user.teamId };
  }
  return { teamId: { in: teamIds } };
}

export function teamScope(user: ScopeUser): Prisma.TeamWhereInput {
  if (seesAllTeams(user.role)) return { active: true };
  if (!user.teamId) return { id: "__none__" };
  return { id: user.teamId, active: true };
}

export async function resolveTeamScope(user: ScopeUser): Promise<Prisma.TeamWhereInput> {
  if (seesAllTeams(user.role)) return { active: true };
  const teamIds = await visibleTeamIds(user);
  if (teamIds == null) return { active: true };
  if (teamIds.length === 0) {
    if (!user.teamId) return { id: "__none__" };
    return { id: user.teamId, active: true };
  }
  return { id: { in: teamIds }, active: true };
}

export function canSeeEstimate(
  user: ScopeUser,
  estimate: { teamId: string; createdById?: string },
): boolean {
  if (seesAllTeams(user.role)) return true;
  return Boolean(user.teamId && estimate.teamId === user.teamId);
}

export async function canSeeEstimateAsync(
  user: ScopeUser,
  estimate: { teamId: string },
): Promise<boolean> {
  if (seesAllTeams(user.role)) return true;
  const teamIds = await visibleTeamIds(user);
  if (teamIds == null) return true;
  if (teamIds.length === 0) return Boolean(user.teamId && estimate.teamId === user.teamId);
  return teamIds.includes(estimate.teamId);
}

export async function assertTeamAccess(user: ScopeUser, teamId: string) {
  if (seesAllTeams(user.role)) return;
  const teamIds = await visibleTeamIds(user);
  if (teamIds == null) return;
  if (teamIds.length > 0) {
    if (!teamIds.includes(teamId)) throw new Error("This profile can only work within its org scope");
    return;
  }
  if (!user.teamId || user.teamId !== teamId) {
    throw new Error("This profile can only work with its own team");
  }
}

export async function teamsForUser(user: ScopeUser) {
  const where = await resolveTeamScope(user);
  return prisma.team.findMany({
    where,
    include: {
      members: true,
      crew: true,
      _count: { select: { estimates: true } },
    },
    orderBy: { name: "asc" },
  });
}
