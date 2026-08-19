import { prisma } from "@/lib/prisma";
import { seesAllTeams } from "@/lib/rbac";
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

export function estimateScope(user: ScopeUser): Prisma.EstimateWhereInput {
  if (seesAllTeams(user.role)) return {};
  if (!user.teamId) return { id: "__none__" };
  return { teamId: user.teamId };
}

export function teamScope(user: ScopeUser): Prisma.TeamWhereInput {
  if (seesAllTeams(user.role)) return { active: true };
  if (!user.teamId) return { id: "__none__" };
  return { id: user.teamId, active: true };
}

export function canSeeEstimate(
  user: ScopeUser,
  estimate: { teamId: string; createdById?: string },
): boolean {
  if (seesAllTeams(user.role)) return true;
  return Boolean(user.teamId && estimate.teamId === user.teamId);
}

export async function assertTeamAccess(user: ScopeUser, teamId: string) {
  if (seesAllTeams(user.role)) return;
  if (!user.teamId || user.teamId !== teamId) {
    throw new Error("This profile can only work with its own team");
  }
}

export async function teamsForUser(user: ScopeUser) {
  const where = teamScope(user);
  return prisma.team.findMany({
    where,
    include: { members: true, _count: { select: { estimates: true } } },
    orderBy: { name: "asc" },
  });
}
