import { NextResponse } from "next/server";
import { requireFeature, requireUser } from "@/lib/api-auth";
import { getCalibration } from "@/services/portfolioService";
import { fromSession, resolveEstimateScope } from "@/lib/scope";
import type { Prisma } from "@prisma/client";

function orgWhere(crew?: string | null, team?: string | null): Prisma.EstimateWhereInput {
  if (team) return { teamId: team };
  if (crew) return { team: { crewId: crew } };
  return {};
}

export async function GET(request: Request) {
  const { session, error } = await requireUser();
  if (error) return error;
  const forbidden = requireFeature(session!.user.role, "calibration.view");
  if (forbidden) return forbidden;
  const url = new URL(request.url);
  const crew = url.searchParams.get("crew");
  const team = url.searchParams.get("team");
  const scope = await resolveEstimateScope(fromSession(session!.user));
  const data = await getCalibration({ ...scope, ...orgWhere(crew, team) });
  return NextResponse.json(data);
}
