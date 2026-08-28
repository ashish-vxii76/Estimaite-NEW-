import { NextResponse } from "next/server";
import { requireFeature, requireUser } from "@/lib/api-auth";
import { getCalibration } from "@/services/portfolioService";
import { fromSession, resolveEstimateScope } from "@/lib/scope";
import { lockedOrgPathForUser } from "@/lib/lockedOrgPath";
import type { Prisma } from "@prisma/client";

async function calibrationWhere(
  user: {
    id: string;
    role: string;
    teamId?: string | null;
    seatOrgUnitId?: string | null;
    activeGrantId?: string | null;
  },
  team?: string | null,
): Promise<Prisma.EstimateWhereInput> {
  const scope = await resolveEstimateScope(fromSession(user));
  const locked = await lockedOrgPathForUser(user.id, {
    activeGrantId: user.activeGrantId,
    seatOrgUnitId: user.seatOrgUnitId,
  });
  const orgWhere: Prisma.EstimateWhereInput = team
    ? { teamId: team }
    : locked.crewId
      ? { team: { crewId: locked.crewId } }
      : {};
  return { ...scope, ...orgWhere };
}

export async function GET(request: Request) {
  const { session, error } = await requireUser();
  if (error) return error;
  const forbidden = requireFeature(session!.user.role, "calibration.view");
  if (forbidden) return forbidden;
  const url = new URL(request.url);
  const team = url.searchParams.get("team");
  const data = await getCalibration(await calibrationWhere(session!.user, team));
  return NextResponse.json(data);
}
