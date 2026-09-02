import { prisma } from "@/lib/prisma";
import { seesAllTeams } from "@/lib/access";
import { adminOrgScope, descendantIds, getPrimarySeat } from "@/services/orgService";
import { resolveEstimateScope, type ScopeUser } from "@/lib/scope";
import type { Prisma } from "@prisma/client";

export type OrgFilterUnit = { id: string; type: string; name: string; parentId: string | null };
export type OrgFilterTeam = { id: string; name: string; crewId: string | null };

export type OrgFilterData = {
  units: OrgFilterUnit[];
  teams: OrgFilterTeam[];
  /** Seat/team anchor + its ancestors: locked (read-only). Empty for sees-all admins. */
  lockedUnitIds: string[];
  /** When set, the Pod/Team select is locked to this team (pod-level users). */
  lockedTeamId: string | null;
};

/**
 * Filter data + locking for the org cascade, by the user's actual level:
 *  - sees-all admin  → whole tree, nothing locked.
 *  - has an org seat → Company…seat-level locked, subtree below the seat selectable, Pod open.
 *  - team only (no seat) → pod-level: Company…Crew AND the Pod all locked to the user's team.
 */
export async function getOrgFilterData(
  user: ScopeUser,
  opts: { adminScoped?: boolean } = {},
): Promise<OrgFilterData> {
  const allUnits = await prisma.orgUnit.findMany({
    where: { active: true },
    select: { id: true, type: true, name: true, parentId: true },
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });

  // DEC-016: for administration scope panels, "unrestricted" and the anchor are seat/grant-driven
  // (an Administrator seated at a crew is scoped to it). Estimate filter bars keep the role-driven
  // sees-all behaviour so admins still see every team's records.
  const adminScope = opts.adminScoped ? await adminOrgScope(user) : null;
  const unrestricted = opts.adminScoped ? adminScope!.appLevel : seesAllTeams(user.role);

  if (unrestricted) {
    const teams = await prisma.team.findMany({
      where: { active: true },
      select: { id: true, name: true, crewId: true },
      orderBy: { name: "asc" },
    });
    return { units: allUnits, teams, lockedUnitIds: [], lockedTeamId: null };
  }

  const byId = new Map(allUnits.map((u) => [u.id, u]));
  // Leadership scope comes from the active role grant, else the DB primary seat.
  const seatOrgUnitId = opts.adminScoped
    ? adminScope!.anchorId
    : user.activeGrantId != null
      ? user.seatOrgUnitId ?? null
      : (await getPrimarySeat(user.id))?.orgUnitId ?? null;

  // Anchor = the org unit whose ancestor chain is locked. Seat unit, else the user's team's crew.
  let anchorUnitId: string | null = null;
  let lockedTeamId: string | null = null;
  let openBelowSeat = false;
  if (seatOrgUnitId) {
    anchorUnitId = seatOrgUnitId;
    openBelowSeat = true; // levels below the seat are selectable
  } else if (user.teamId) {
    const team = await prisma.team.findUnique({ where: { id: user.teamId }, select: { crewId: true } });
    anchorUnitId = team?.crewId ?? null;
    lockedTeamId = user.teamId; // pod-level: lock the Pod too
  }

  if (!anchorUnitId && !lockedTeamId) {
    return { units: [], teams: [], lockedUnitIds: [], lockedTeamId: null };
  }

  const lockedUnitIds: string[] = [];
  if (anchorUnitId) {
    let cur = byId.get(anchorUnitId);
    while (cur) {
      lockedUnitIds.push(cur.id);
      cur = cur.parentId ? byId.get(cur.parentId) : undefined;
    }
  }

  const visibleIds = openBelowSeat && anchorUnitId ? await descendantIds(anchorUnitId) : [];
  const allowed = new Set<string>([...visibleIds, ...lockedUnitIds]);
  const units = allUnits.filter((u) => allowed.has(u.id));

  let teams: OrgFilterTeam[];
  if (lockedTeamId) {
    teams = await prisma.team.findMany({
      where: { id: lockedTeamId },
      select: { id: true, name: true, crewId: true },
    });
  } else {
    const crewIdsInScope = units.filter((u) => u.type === "CREW").map((u) => u.id);
    teams = await prisma.team.findMany({
      where: { active: true, crewId: { in: crewIdsInScope } },
      select: { id: true, name: true, crewId: true },
      orderBy: { name: "asc" },
    });
  }
  return { units, teams, lockedUnitIds, lockedTeamId };
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
