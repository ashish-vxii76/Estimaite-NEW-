import { prisma } from "@/lib/prisma";
import { appendAuditEvent } from "@/services/auditService";
import type { OrgPath, OrgSeatType, OrgType } from "@/lib/orgTypes";
import { ORG_TYPES } from "@/lib/orgTypes";
import { seesAllTeams } from "@/lib/access";

export type OrgUnitRow = {
  id: string;
  type: string;
  name: string;
  parentId: string | null;
  active: boolean;
};

export async function listOrgUnits(activeOnly = true) {
  return prisma.orgUnit.findMany({
    where: activeOnly ? { active: true } : undefined,
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });
}

export async function getOrgTree() {
  const units = await listOrgUnits(false);
  return units;
}

export async function createOrgUnit(input: {
  type: OrgType;
  name: string;
  parentId?: string | null;
}) {
  const name = input.name.trim();
  if (!name) throw new Error("Name is required");
  if (!ORG_TYPES.includes(input.type)) throw new Error("Invalid org type");
  if (input.type === "COMPANY" && input.parentId) {
    throw new Error("Company cannot have a parent");
  }
  if (input.type !== "COMPANY" && !input.parentId) {
    throw new Error(`${input.type} requires a parent`);
  }
  if (input.parentId) {
    const parent = await prisma.orgUnit.findUnique({ where: { id: input.parentId } });
    if (!parent || !parent.active) throw new Error("Parent org unit not found");
  }
  return prisma.orgUnit.create({
    data: {
      type: input.type,
      name,
      parentId: input.parentId || null,
      active: true,
    },
  });
}

export async function updateOrgUnit(
  id: string,
  data: { name?: string; active?: boolean; parentId?: string | null; currency?: string },
) {
  const existing = await prisma.orgUnit.findUnique({ where: { id } });
  if (!existing) throw new Error("Org unit not found");
  return prisma.orgUnit.update({
    where: { id },
    data: {
      ...(data.name != null ? { name: data.name.trim() } : {}),
      ...(data.active != null ? { active: data.active } : {}),
      ...(data.parentId !== undefined ? { parentId: data.parentId } : {}),
      ...(data.currency ? { currency: data.currency.trim().toUpperCase() } : {}),
    },
  });
}

/**
 * The reporting currency for a scope: the Company ancestor's currency of the selected node or
 * crews. Falls back to the sole Company's currency, else CHF. Enforces single-currency reporting.
 */
export async function resolveOrgCurrency(opts: {
  orgUnitId?: string | null;
  crewIds?: string[] | null;
}): Promise<string> {
  const units = await prisma.orgUnit.findMany({
    select: { id: true, type: true, parentId: true, currency: true },
  });
  const byId = new Map(units.map((u) => [u.id, u]));
  const companyCurrencyOf = (startId: string): string | null => {
    let cur = byId.get(startId);
    while (cur) {
      if (cur.type === "COMPANY") return cur.currency;
      cur = cur.parentId ? byId.get(cur.parentId) : undefined;
    }
    return null;
  };
  if (opts.orgUnitId) {
    const c = companyCurrencyOf(opts.orgUnitId);
    if (c) return c;
  }
  if (opts.crewIds && opts.crewIds.length) {
    const c = companyCurrencyOf(opts.crewIds[0]);
    if (c) return c;
  }
  const companies = units.filter((u) => u.type === "COMPANY");
  return companies[0]?.currency ?? "CHF";
}

export async function setTeamCrew(teamId: string, crewId: string | null) {
  if (crewId) {
    const crew = await prisma.orgUnit.findUnique({ where: { id: crewId } });
    if (!crew || crew.type !== "CREW") throw new Error("Crew not found");
  }
  return prisma.team.update({
    where: { id: teamId },
    data: { crewId },
  });
}

export async function resolveOrgPathForTeam(teamId: string): Promise<OrgPath | null> {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: { crew: true },
  });
  if (!team?.crew) return null;
  const crew = team.crew;
  const stream = crew.parentId
    ? await prisma.orgUnit.findUnique({ where: { id: crew.parentId } })
    : null;
  const subDivision = stream?.parentId
    ? await prisma.orgUnit.findUnique({ where: { id: stream.parentId } })
    : null;
  const division = subDivision?.parentId
    ? await prisma.orgUnit.findUnique({ where: { id: subDivision.parentId } })
    : null;
  const company = division?.parentId
    ? await prisma.orgUnit.findUnique({ where: { id: division.parentId } })
    : null;
  if (!company || !division || !subDivision || !stream) return null;
  return {
    companyId: company.id,
    companyName: company.name,
    divisionId: division.id,
    divisionName: division.name,
    subDivisionId: subDivision.id,
    subDivisionName: subDivision.name,
    streamId: stream.id,
    streamName: stream.name,
    crewId: crew.id,
    crewName: crew.name,
    teamId: team.id,
    teamName: team.name,
  };
}

export async function descendantIds(rootId: string): Promise<string[]> {
  const all = await prisma.orgUnit.findMany({ select: { id: true, parentId: true } });
  const children = new Map<string, string[]>();
  for (const u of all) {
    if (!u.parentId) continue;
    const list = children.get(u.parentId) ?? [];
    list.push(u.id);
    children.set(u.parentId, list);
  }
  const out: string[] = [];
  const stack = [rootId];
  while (stack.length) {
    const id = stack.pop()!;
    out.push(id);
    for (const child of children.get(id) ?? []) stack.push(child);
  }
  return out;
}

export async function getPrimarySeat(userId: string) {
  return prisma.orgSeat.findFirst({
    where: { userId, isPrimary: true },
    include: { orgUnit: true },
  });
}

/**
 * Org unit ids the user may see (subtree of primary seat).
 * App-wide Admin with scope.allTeams sees everything (returns null = unrestricted).
 */
/** Scope inputs; the grant fields are set when a switchable role is active. */
type ScopeInput = {
  id: string;
  role: string;
  teamId?: string | null;
  seatOrgUnitId?: string | null;
  activeGrantId?: string | null;
};

export async function visibleOrgUnitIds(user: ScopeInput): Promise<string[] | null> {
  if (seesAllTeams(user.role)) return null;
  // Active role grant → use its own scope, never the DB primary seat.
  if (user.activeGrantId != null) {
    return user.seatOrgUnitId ? descendantIds(user.seatOrgUnitId) : [];
  }
  const seat = await getPrimarySeat(user.id);
  if (!seat) return [];
  return descendantIds(seat.orgUnitId);
}

/**
 * DEC-016 admin scope. Unlike `visibleOrgUnitIds` (role-driven: an ADMINISTRATOR is blanket sees-all),
 * administration authority is anchored to the actor's SEAT/GRANT org unit — so an admin seated at a
 * Crew administers only that crew's subtree, even if their role would otherwise see all teams.
 *  - appLevel  → unseated sees-all admin: unrestricted App authority.
 *  - anchorId  → the org unit their authority is anchored to (seat/grant).
 *  - visibleIds → anchor + all descendants (the subtree they may touch).
 * Creation/deletion is gated one level at a time by the helpers below.
 */
export type OrgAdminScope = {
  appLevel: boolean;
  anchorId: string | null;
  anchorType: string | null;
  visibleIds: Set<string>;
};

export async function adminOrgScope(user: ScopeInput): Promise<OrgAdminScope> {
  const anchorId =
    user.activeGrantId != null
      ? user.seatOrgUnitId ?? null
      : (await getPrimarySeat(user.id))?.orgUnitId ?? null;
  if (!anchorId) {
    // No seat/grant anchor: a sees-all role is the App admin; anyone else has no admin scope.
    return { appLevel: seesAllTeams(user.role), anchorId: null, anchorType: null, visibleIds: new Set() };
  }
  const ids = await descendantIds(anchorId); // includes the anchor itself
  const anchor = await prisma.orgUnit.findUnique({ where: { id: anchorId }, select: { type: true } });
  return { appLevel: false, anchorId, anchorType: anchor?.type ?? null, visibleIds: new Set(ids) };
}

/** May the actor edit this unit's details (name/currency/seats/members)? Anchor + descendants. */
export function canWriteUnit(scope: OrgAdminScope, unitId: string): boolean {
  return scope.appLevel || scope.visibleIds.has(unitId);
}

/** May the actor archive/deactivate this unit? A strict descendant only — never their own anchor or above. */
export function canArchiveUnit(scope: OrgAdminScope, unitId: string): boolean {
  return scope.appLevel || (scope.visibleIds.has(unitId) && unitId !== scope.anchorId);
}

/** May the actor create a child under this parent? Parent must be in scope; top-level (Company) is App-only. */
export function canCreateUnderParent(scope: OrgAdminScope, parentId: string | null): boolean {
  if (scope.appLevel) return true;
  if (parentId == null) return false;
  return scope.visibleIds.has(parentId);
}

/** Crews the actor administers (seat/grant-driven). null = all (App admin). */
export async function adminVisibleCrewIds(user: ScopeInput): Promise<string[] | null> {
  const scope = await adminOrgScope(user);
  if (scope.appLevel) return null;
  const crews = await prisma.orgUnit.findMany({
    where: { id: { in: [...scope.visibleIds] }, type: "CREW", active: true },
    select: { id: true },
  });
  return crews.map((c) => c.id);
}

export async function visibleCrewIds(user: ScopeInput): Promise<string[] | null> {
  const ids = await visibleOrgUnitIds(user);
  if (ids == null) {
    const crews = await prisma.orgUnit.findMany({
      where: { type: "CREW", active: true },
      select: { id: true },
    });
    return crews.map((c) => c.id);
  }
  const crews = await prisma.orgUnit.findMany({
    where: { id: { in: ids }, type: "CREW", active: true },
    select: { id: true },
  });
  return crews.map((c) => c.id);
}

export async function visibleTeamIds(user: ScopeInput): Promise<string[] | null> {
  if (seesAllTeams(user.role)) return null;
  const crewIds = await visibleCrewIds(user);
  if (!crewIds || crewIds.length === 0) {
    // No crew scope → fall back to the pod. An active grant carries its own teamId;
    // otherwise read the user's legacy pod membership.
    if (user.activeGrantId != null) return user.teamId ? [user.teamId] : [];
    const me = await prisma.user.findUnique({ where: { id: user.id }, select: { teamId: true } });
    return me?.teamId ? [me.teamId] : [];
  }
  const teams = await prisma.team.findMany({
    where: { crewId: { in: crewIds }, active: true },
    select: { id: true },
  });
  return teams.map((t) => t.id);
}

export async function upsertPrimarySeat(input: {
  userId: string;
  orgUnitId: string;
  seatType: OrgSeatType;
}) {
  const orgUnit = await prisma.orgUnit.findUnique({ where: { id: input.orgUnitId } });
  if (!orgUnit) throw new Error("Org unit not found");
  await prisma.orgSeat.updateMany({
    where: { userId: input.userId, isPrimary: true },
    data: { isPrimary: false },
  });
  const existing = await prisma.orgSeat.findFirst({
    where: { userId: input.userId, orgUnitId: input.orgUnitId, seatType: input.seatType },
  });
  if (existing) {
    return prisma.orgSeat.update({
      where: { id: existing.id },
      data: { isPrimary: true },
    });
  }
  return prisma.orgSeat.create({
    data: {
      userId: input.userId,
      orgUnitId: input.orgUnitId,
      seatType: input.seatType,
      isPrimary: true,
    },
  });
}

export async function listCrewBudgets(year?: number | null, crewIds?: string[] | null) {
  return prisma.crewBudget.findMany({
    where: {
      ...(year != null ? { year } : {}),
      ...(crewIds != null ? { crewId: { in: crewIds } } : {}),
    },
    include: { crew: true },
    orderBy: [{ year: "desc" }, { crew: { name: "asc" } }],
  });
}

export async function saveCrewBudget(input: {
  crewId: string;
  year: number;
  amount: number;
  allowUpdate: boolean;
  actorUserId?: string;
}) {
  const crew = await prisma.orgUnit.findUnique({ where: { id: input.crewId } });
  if (!crew || crew.type !== "CREW") throw new Error("Budget is only allowed at Crew level");
  if (!Number.isFinite(input.year) || input.year < 2000) throw new Error("Invalid year");
  if (!Number.isFinite(input.amount) || input.amount < 0) throw new Error("Invalid amount");

  const existing = await prisma.crewBudget.findUnique({
    where: { crewId_year: { crewId: input.crewId, year: input.year } },
  });
  if (existing && !input.allowUpdate) {
    throw new Error("Budget already exists for this Crew and year — please update the existing record");
  }

  const saved = existing
    ? await prisma.crewBudget.update({
        where: { id: existing.id },
        data: { amount: input.amount, currency: "CHF" },
        include: { crew: true },
      })
    : await prisma.crewBudget.create({
        data: {
          crewId: input.crewId,
          year: input.year,
          amount: input.amount,
          currency: "CHF",
        },
        include: { crew: true },
      });

  await appendAuditEvent({
      userId: input.actorUserId,
      action: existing ? "CREW_BUDGET_UPDATED" : "CREW_BUDGET_CREATED",
      previousValue: existing ? JSON.stringify(existing) : "",
      newValue: JSON.stringify({
        crewId: saved.crewId,
        year: saved.year,
        amount: saved.amount,
        currency: saved.currency,
      }),
  });
  return saved;
}

export async function deleteCrewBudget(id: string, actorUserId?: string) {
  const existing = await prisma.crewBudget.findUnique({ where: { id }, include: { crew: true } });
  if (!existing) throw new Error("Budget not found");
  await prisma.crewBudget.delete({ where: { id } });
  await appendAuditEvent({
    userId: actorUserId,
    action: "CREW_BUDGET_DELETED",
    previousValue: JSON.stringify({
      crewId: existing.crewId,
      year: existing.year,
      amount: existing.amount,
      currency: existing.currency,
    }),
    newValue: "",
  });
  return existing;
}

export async function sumCrewBudgets(year?: number | null, crewIds?: string[] | null) {
  const rows = await listCrewBudgets(year, crewIds);
  return rows.reduce((sum, row) => sum + row.amount, 0);
}
