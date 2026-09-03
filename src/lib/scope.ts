import { prisma } from "@/lib/prisma";
import { seesAllTeams } from "@/lib/access";
import { visibleTeamIds, isAppLevelAdmin } from "@/services/orgService";
import type { Prisma } from "@prisma/client";

export type ScopeUser = {
  id: string;
  role: string;
  teamId?: string | null;
  /** Active leadership scope (org unit) — set when a role grant is active. */
  seatOrgUnitId?: string | null;
  /** Non-null when the user is running as a switchable role grant. */
  activeGrantId?: string | null;
};

export function fromSession(user: {
  id: string;
  role: string;
  teamId?: string | null;
  seatOrgUnitId?: string | null;
  activeGrantId?: string | null;
}): ScopeUser {
  return {
    id: user.id,
    role: user.role,
    teamId: user.teamId ?? null,
    seatOrgUnitId: user.seatOrgUnitId ?? null,
    activeGrantId: user.activeGrantId ?? null,
  };
}

/** Legacy sync scope (pod teamId only). Prefer resolveEstimateScope. */
export function estimateScope(user: ScopeUser): Prisma.EstimateWhereInput {
  if (seesAllTeams(user.role)) return {};
  if (!user.teamId) return { id: "__none__" };
  return { teamId: user.teamId };
}

/**
 * Roles that see ONLY the estimates they authored (through the full lifecycle), regardless of
 * seat level — an Estimator raises CRs and tracks their own to approval, nothing else.
 */
const OWNER_SCOPED_ROLES = new Set(["ESTIMATOR"]);

/**
 * Workflow roles are QUEUE-scoped: they see only the statuses their function acts on, within their
 * seat scope — not the crew's whole backlog. Reviewer = their review queue; Approver = their approval
 * queue + what they approved. Leadership (Delivery Lead) is NOT here — it keeps full-stage oversight.
 */
export const ROLE_STATUS_SCOPE: Record<string, string[]> = {
  REVIEWER: ["READY_FOR_REVIEW"],
  APPROVER: ["REVIEWED", "APPROVED"],
};

/** The seat/team WhereInput for a non-owner, non-app-level user (no status constraint). */
async function teamWhereFor(user: ScopeUser): Promise<Prisma.EstimateWhereInput> {
  const teamIds = await visibleTeamIds(user);
  if (teamIds == null) return {};
  if (teamIds.length === 0) return user.teamId ? { teamId: user.teamId } : { id: "__none__" };
  return { teamId: { in: teamIds } };
}

/** Org-aware estimate scope: subtree of primary seat, else legacy team; queue-scoped for workflow roles. */
export async function resolveEstimateScope(user: ScopeUser): Promise<Prisma.EstimateWhereInput> {
  if (await isAppLevelAdmin(user)) return {};
  if (OWNER_SCOPED_ROLES.has(user.role)) return { createdById: user.id };
  const teamWhere = await teamWhereFor(user);
  const statuses = ROLE_STATUS_SCOPE[user.role];
  if (!statuses) return teamWhere;
  // Status constraint goes inside AND so a URL ?status= filter can only NARROW it, never widen it.
  const statusWhere: Prisma.EstimateWhereInput = { status: { in: statuses } };
  return isEmptyWhere(teamWhere) ? statusWhere : { AND: [teamWhere, statusWhere] };
}

const isEmptyWhere = (w: Prisma.EstimateWhereInput) => Object.keys(w).length === 0;

export function teamScope(user: ScopeUser): Prisma.TeamWhereInput {
  if (seesAllTeams(user.role)) return { active: true };
  if (!user.teamId) return { id: "__none__" };
  return { id: user.teamId, active: true };
}

export async function resolveTeamScope(user: ScopeUser): Promise<Prisma.TeamWhereInput> {
  if (await isAppLevelAdmin(user)) return { active: true };
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
  estimate: { teamId: string; status?: string; createdById?: string | null },
): Promise<boolean> {
  if (await isAppLevelAdmin(user)) return true;
  // Estimator: only their own authored records (any stage).
  if (OWNER_SCOPED_ROLES.has(user.role)) {
    return estimate.createdById != null && estimate.createdById === user.id;
  }
  // Workflow roles: only the statuses their queue covers.
  const statuses = ROLE_STATUS_SCOPE[user.role];
  if (statuses && (estimate.status == null || !statuses.includes(estimate.status))) return false;
  const teamIds = await visibleTeamIds(user);
  if (teamIds == null) return true;
  if (teamIds.length === 0) return Boolean(user.teamId && estimate.teamId === user.teamId);
  return teamIds.includes(estimate.teamId);
}

export async function assertTeamAccess(user: ScopeUser, teamId: string) {
  if (await isAppLevelAdmin(user)) return;
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
