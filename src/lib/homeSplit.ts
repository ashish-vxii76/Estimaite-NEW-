import type { OrgFilterUnit, OrgFilterTeam } from "@/lib/orgFilter";
import { ORG_TYPES, ORG_TYPE_LABEL, type OrgType } from "@/lib/orgTypes";

export type SplitUnit = { id: string; name: string; type: OrgType };

export type HomeSplit = {
  /** The org level the dashboard groups by, or null when there is nothing to compare. */
  splitType: OrgType | null;
  /** Human label for the split level, e.g. "Company" / "Division". */
  splitLabel: string;
  /** The units at the split level (length > 1 whenever a split applies). */
  units: SplitUnit[];
  /** teamId → the split-level ancestor unit id (null when it can't be resolved). */
  teamToUnitId: Record<string, string | null>;
  /** split unit id → the crew ids beneath it (for org-scoped roll-ups). */
  unitCrewIds: Record<string, string[]>;
};

const EMPTY: HomeSplit = {
  splitType: null,
  splitLabel: "",
  units: [],
  teamToUnitId: {},
  unitCrewIds: {},
};

/**
 * Decide how the home dashboard should be split, from the viewer's *visible* org tree.
 *
 * Rule (DEC-016 aligned): group by the shallowest org level that has more than one
 * visible unit. An App admin sees many companies → split by Company; a Company-scoped
 * admin sees one company but many divisions → split by Division; a single-crew user has
 * nothing to compare → no split (the plain scoped dashboard). This generalises to every
 * role and scales with however many orgs exist in the database — nothing is hardcoded.
 */
export function computeHomeSplit(units: OrgFilterUnit[], teams: OrgFilterTeam[]): HomeSplit {
  const byId = new Map(units.map((u) => [u.id, u]));

  let splitType: OrgType | null = null;
  for (const t of ORG_TYPES) {
    if (units.filter((u) => u.type === t).length > 1) {
      splitType = t;
      break;
    }
  }
  if (!splitType) return EMPTY;

  const splitUnits: SplitUnit[] = units
    .filter((u) => u.type === splitType)
    .map((u) => ({ id: u.id, name: u.name, type: splitType! }));
  const splitIds = new Set(splitUnits.map((u) => u.id));

  // Walk up the parent chain to the ancestor that sits at the split level.
  const ancestorAtSplit = (unitId: string | null | undefined): string | null => {
    let cur = unitId ? byId.get(unitId) : undefined;
    while (cur) {
      if (splitIds.has(cur.id)) return cur.id;
      cur = cur.parentId ? byId.get(cur.parentId) : undefined;
    }
    return null;
  };

  const teamToUnitId: Record<string, string | null> = {};
  for (const tm of teams) teamToUnitId[tm.id] = ancestorAtSplit(tm.crewId);

  const unitCrewIds: Record<string, string[]> = {};
  for (const u of splitUnits) unitCrewIds[u.id] = [];
  for (const crew of units.filter((u) => u.type === "CREW")) {
    const anchor = ancestorAtSplit(crew.id);
    if (anchor && unitCrewIds[anchor]) unitCrewIds[anchor].push(crew.id);
  }

  return {
    splitType,
    splitLabel: ORG_TYPE_LABEL[splitType],
    units: splitUnits,
    teamToUnitId,
    unitCrewIds,
  };
}
