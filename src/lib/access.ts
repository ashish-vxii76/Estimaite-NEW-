import {
  can as canWithMatrix,
  canAccessPath as pathWithMatrix,
  seesAllTeams as seesAllTeamsWithMatrix,
  writesOwnRecordsOnly as writesOwnRecordsOnlyWithMatrix,
  type FeatureId,
} from "@/lib/rbac";
import { getCachedRbacMatrix } from "@/services/rbacService";

/** Server-side checks against the saved matrix (layout / requireUser load it first). */
export function can(role: string | null | undefined, feature: FeatureId, mode: "R" | "RW" = "R") {
  return canWithMatrix(role, feature, mode, getCachedRbacMatrix());
}

export function canAccessPath(role: string | null | undefined, pathname: string) {
  return pathWithMatrix(role, pathname, getCachedRbacMatrix());
}

export function seesAllTeams(role: string | null | undefined) {
  return seesAllTeamsWithMatrix(role, getCachedRbacMatrix());
}

export function writesOwnRecordsOnly(role: string | null | undefined) {
  return writesOwnRecordsOnlyWithMatrix(role, getCachedRbacMatrix());
}
