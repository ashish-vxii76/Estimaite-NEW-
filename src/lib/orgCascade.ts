import type { Prisma } from "@prisma/client";
import type { LockedOrgPathView } from "@/lib/lockedOrgPath";

export type OrgUnitRow = {
  id: string;
  type: string;
  name: string;
  parentId: string | null;
};

export type OrgCascadeParams = {
  company?: string;
  division?: string;
  subDivision?: string;
  stream?: string;
  crew?: string;
  team?: string;
};

/** Deepest selected org-unit id in the cascade (Company…Crew). */
export function deepestOrgUnitId(sel: OrgCascadeParams): string | null {
  return (
    sel.crew ||
    sel.stream ||
    sel.subDivision ||
    sel.division ||
    sel.company ||
    null
  );
}

/** All Crew ids under an org unit (inclusive if the unit is a Crew). */
export function crewIdsUnder(
  units: OrgUnitRow[],
  rootId: string | null | undefined,
): string[] | null {
  if (!rootId) return null;
  const byParent = new Map<string, OrgUnitRow[]>();
  for (const u of units) {
    if (!u.parentId) continue;
    const list = byParent.get(u.parentId) ?? [];
    list.push(u);
    byParent.set(u.parentId, list);
  }
  const root = units.find((u) => u.id === rootId);
  if (!root) return [];
  const crews: string[] = [];
  const stack = [root];
  while (stack.length) {
    const cur = stack.pop()!;
    if (cur.type === "CREW") crews.push(cur.id);
    for (const child of byParent.get(cur.id) ?? []) stack.push(child);
  }
  return crews;
}

/**
 * Prisma estimate filter for org cascade + optional pod.
 * Returns {} when nothing selected beyond the caller’s existing scope.
 */
export function estimateWhereForOrgCascade(
  units: OrgUnitRow[],
  sel: OrgCascadeParams,
): Prisma.EstimateWhereInput {
  if (sel.team) return { teamId: sel.team };
  const root = deepestOrgUnitId(sel);
  if (!root) return {};
  const crewIds = crewIdsUnder(units, root);
  if (!crewIds || crewIds.length === 0) return { id: "__none__" };
  return { team: { crewId: { in: crewIds } } };
}

/** Pods whose Crew sits under the selected cascade (or all given teams). */
export function teamsMatchingCascade<T extends { id: string; crewId?: string | null }>(
  units: OrgUnitRow[],
  teams: T[],
  sel: OrgCascadeParams,
): T[] {
  if (sel.team) return teams.filter((t) => t.id === sel.team);
  const root = deepestOrgUnitId(sel);
  if (!root) return teams;
  const crewIds = new Set(crewIdsUnder(units, root) ?? []);
  return teams.filter((t) => t.crewId && crewIds.has(t.crewId));
}

export type CascadeLockIds = {
  companyId: string;
  divisionId: string;
  subDivisionId: string;
  streamId: string;
  crewId: string;
};

/** Prefer IDs carried on the locked path; fall back to name lookup. */
export function lockIdsFromPath(
  units: OrgUnitRow[],
  path: LockedOrgPathView,
): CascadeLockIds {
  const byTypeName = (type: string, name: string) =>
    name && name !== "All"
      ? units.find((u) => u.type === type && u.name === name)?.id ?? ""
      : "";
  return {
    companyId: path.companyId || byTypeName("COMPANY", path.companyName),
    divisionId: path.divisionId || byTypeName("DIVISION", path.divisionName),
    subDivisionId: path.subDivisionId || byTypeName("SUB_DIVISION", path.subDivisionName),
    streamId: path.streamId || byTypeName("STREAM", path.streamName),
    crewId: path.crewId ?? byTypeName("CREW", path.crewName),
  };
}
