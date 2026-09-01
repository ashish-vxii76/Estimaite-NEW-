import { getOrgFilterData, type OrgFilterUnit } from "@/lib/orgFilter";
import type { ScopeUser } from "@/lib/scope";

export type CrewScope = {
  units: OrgFilterUnit[];
  lockedUnitIds: string[];
  /** CREW units the user may configure (their scope). */
  crews: { id: string; name: string }[];
  /** The resolved active crew the editor acts on. */
  activeCrewId: string | null;
  /** true → every level is selectable (sees-all admin). */
  adminAll: boolean;
};

/**
 * DEC-011 M1: derive the Company→Crew scope panel from the user's active role grant.
 * Levels in `lockedUnitIds` render read-only (auto-selected); the rest are selectable. A pod/seat
 * that resolves to a single crew forces `activeCrewId`; a leader with several crews may pick one
 * (honoured only if it is inside scope — a scoped user can never widen past their grant).
 */
export async function resolveCrewScope(
  user: ScopeUser,
  requestedCrewId?: string | null,
): Promise<CrewScope> {
  const { units, lockedUnitIds } = await getOrgFilterData(user);

  const crews = units
    .filter((u) => u.type === "CREW")
    .map((u) => ({ id: u.id, name: u.name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  // A locked crew (pod-level user) forces the active crew.
  const lockedCrewId = units.find((u) => u.type === "CREW" && lockedUnitIds.includes(u.id))?.id ?? null;

  const inScope = new Set(crews.map((c) => c.id));
  let activeCrewId: string | null = null;
  if (lockedCrewId) {
    activeCrewId = lockedCrewId; // read-only, never overridable by the request
  } else if (requestedCrewId && inScope.has(requestedCrewId)) {
    activeCrewId = requestedCrewId;
  } else {
    activeCrewId = crews[0]?.id ?? null;
  }

  return { units, lockedUnitIds, crews, activeCrewId, adminAll: lockedUnitIds.length === 0 };
}
