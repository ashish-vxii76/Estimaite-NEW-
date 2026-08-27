import { prisma } from "@/lib/prisma";
import { seesAllTeams } from "@/lib/access";
import { descendantIds, getPrimarySeat, visibleOrgUnitIds } from "@/services/orgService";
import { resolveEstimateScope, type ScopeUser } from "@/lib/scope";
import type { Prisma } from "@prisma/client";

export type OrgFilterUnit = { id: string; type: string; name: string; parentId: string | null };
export type OrgFilterTeam = { id: string; name: string; crewId: string | null };

export type OrgFilterData = {
  units: OrgFilterUnit[];
  teams: OrgFilterTeam[];
  /** Seat + its ancestors: locked (read-only) for this user. Empty for sees-all admins. */
  lockedUnitIds: string[];
};

/**
 * Filter data for the org cascade. Admins (sees-all) get the whole tree, nothing locked.
 * A scoped user gets their seat subtree plus the locked ancestor chain up to Company.
 */
export async function getOrgFilterData(user: ScopeUser): Promise<OrgFilterData> {
  const allUnits = await prisma.orgUnit.findMany({
    where: { active: true },
    select: { id: true, type: true, name: true, parentId: true },
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });

  if (seesAllTeams(user.role)) {
    const teams = await prisma.team.findMany({
      where: { active: true },
      select: { id: true, name: true, crewId: true },
      orderBy: { name: "asc" },
    });
    return { units: allUnits, teams, lockedUnitIds: [] };
  }

  const byId = new Map(allUnits.map((u) => [u.id, u]));
  const visibleIds = await visibleOrgUnitIds(user); // subtree of the seat (or [])
  const seat = await getPrimarySeat(user.id);

  const lockedUnitIds: string[] = [];
  if (seat) {
    let cur = byId.get(seat.orgUnitId);
    while (cur) {
      lockedUnitIds.push(cur.id);
      cur = cur.parentId ? byId.get(cur.parentId) : undefined;
    }
  }

  const allowed = new Set<string>([...(visibleIds ?? []), ...lockedUnitIds]);
  const units = allUnits.filter((u) => allowed.has(u.id));
  const crewIdsInScope = units.filter((u) => u.type === "CREW").map((u) => u.id);
  const teams = await prisma.team.findMany({
    where: { active: true, crewId: { in: crewIdsInScope } },
    select: { id: true, name: true, crewId: true },
    orderBy: { name: "asc" },
  });
  return { units, teams, lockedUnitIds };
}

async function teamIdsUnderOrgUnit(orgUnitId: string): Promise<string[]> {
  const ids = await descendantIds(orgUnitId);
  const teams = await prisma.team.findMany({
    where: { active: true, crewId: { in: ids } },
    select: { id: true },
  });
  return teams.map((t) => t.id);
}

const isEmpty = (w: Prisma.EstimateWhereInput) => Object.keys(w).length === 0;

/**
 * Estimate `where` for the selected org node / pod, intersected with the user's own scope
 * so a scoped user can never widen past their seat by editing the URL.
 */
export async function resolveOrgSelectionWhere(
  user: ScopeUser,
  org: string,
  team: string,
): Promise<Prisma.EstimateWhereInput> {
  const base = await resolveEstimateScope(user);
  let sel: Prisma.EstimateWhereInput = {};
  if (team) {
    sel = { teamId: team };
  } else if (org) {
    sel = { teamId: { in: await teamIdsUnderOrgUnit(org) } };
  }
  if (isEmpty(base)) return sel;
  if (isEmpty(sel)) return base;
  return { AND: [base, sel] };
}
