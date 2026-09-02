import { getOrgFilterData, type OrgFilterUnit } from "@/lib/orgFilter";
import type { ScopeUser } from "@/lib/scope";

export type ScopeType = "APP" | "COMPANY" | "CREW";

export type CrewScope = {
  units: OrgFilterUnit[];
  lockedUnitIds: string[];
  /** CREW units the user may configure (their scope). */
  crews: { id: string; name: string }[];
  /** The resolved active scope unit the editor acts on (crew OR company); null = App global. */
  activeCrewId: string | null;
  /** DEC-015: which rung of the cascade is being edited. */
  activeScopeType: ScopeType;
  /** Display name for the active scope ("Application (all)" when APP). */
  activeScopeName: string;
  /** true → every level is selectable (sees-all admin). */
  adminAll: boolean;
};

/**
 * DEC-011 M1 / DEC-015: derive the Company→Crew scope panel from the user's active role grant, and
 * resolve which cascade rung is being edited. The requested scope unit may be a CREW or a COMPANY
 * (App when unset / "ALL"). Levels in `lockedUnitIds` render read-only. A pod/seat that resolves to a
 * single crew forces the crew scope; a leader may pick a crew/company inside their grant.
 */
export async function resolveCrewScope(
  user: ScopeUser,
  requestedScopeId?: string | null,
): Promise<CrewScope> {
  const { units, lockedUnitIds } = await getOrgFilterData(user);
  const byId = new Map(units.map((u) => [u.id, u]));

  const crews = units
    .filter((u) => u.type === "CREW")
    .map((u) => ({ id: u.id, name: u.name }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const inScopeCrews = new Set(crews.map((c) => c.id));
  const inScopeCompanies = new Set(units.filter((u) => u.type === "COMPANY").map((u) => u.id));

  // A locked crew (pod-level user) forces the active crew.
  const lockedCrewId = units.find((u) => u.type === "CREW" && lockedUnitIds.includes(u.id))?.id ?? null;

  let activeCrewId: string | null = null;
  let activeScopeType: ScopeType = "APP";
  if (lockedCrewId) {
    activeCrewId = lockedCrewId;
    activeScopeType = "CREW";
  } else if (requestedScopeId && requestedScopeId !== "ALL") {
    if (inScopeCrews.has(requestedScopeId)) {
      activeCrewId = requestedScopeId;
      activeScopeType = "CREW";
    } else if (inScopeCompanies.has(requestedScopeId)) {
      activeCrewId = requestedScopeId;
      activeScopeType = "COMPANY";
    }
  }

  const activeScopeName = activeCrewId ? byId.get(activeCrewId)?.name ?? "—" : "Application (all)";

  return {
    units,
    lockedUnitIds,
    crews,
    activeCrewId,
    activeScopeType,
    activeScopeName,
    adminAll: lockedUnitIds.length === 0,
  };
}
