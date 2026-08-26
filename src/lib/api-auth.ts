import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { can, type FeatureId } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { canSeeEstimateAsync, fromSession } from "@/lib/scope";
import { getCachedRbacMatrix, getRbacMatrix, isRbacLoaded } from "@/services/rbacService";

export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) {
    return { session: null, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  await getRbacMatrix();
  return { session, error: null };
}

export async function requireVisibleEstimate(user: {
  id: string;
  role: string;
  teamId?: string | null;
}, id: string) {
  const estimate = await prisma.estimate.findUnique({ where: { id } });
  if (!estimate) {
    return { estimate: null, error: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  }
  if (!(await canSeeEstimateAsync(fromSession(user), estimate))) {
    return { estimate: null, error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { estimate, error: null };
}

export function requireFeature(role: string, feature: FeatureId, mode: "R" | "RW" = "R") {
  // #8: fail closed — never authorize against DEFAULT_RBAC when the real matrix isn't loaded.
  if (!isRbacLoaded()) {
    return NextResponse.json({ error: "Authorization temporarily unavailable" }, { status: 503 });
  }
  if (!can(role, feature, mode, getCachedRbacMatrix())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

export function requireRole(role: string, allowed: string[]) {
  if (!allowed.includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}
