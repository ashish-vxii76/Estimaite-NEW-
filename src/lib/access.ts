import { can as canWithMatrix, canAccessPath as pathWithMatrix, type FeatureId } from "@/lib/rbac";
import { getCachedRbacMatrix } from "@/services/rbacService";

/** Server-side checks against the saved matrix (layout / requireUser load it first). */
export function can(role: string | null | undefined, feature: FeatureId, mode: "R" | "RW" = "R") {
  return canWithMatrix(role, feature, mode, getCachedRbacMatrix());
}

export function canAccessPath(role: string | null | undefined, pathname: string) {
  return pathWithMatrix(role, pathname, getCachedRbacMatrix());
}
