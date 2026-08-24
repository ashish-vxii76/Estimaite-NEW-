import { NextResponse } from "next/server";
import { requireFeature, requireUser } from "@/lib/api-auth";
import { getActiveConfig, patchActiveConfig } from "@/services/configService";
import { getCalibration } from "@/services/portfolioService";
import { fromSession, resolveEstimateScope } from "@/lib/scope";
import type { Prisma } from "@prisma/client";

function orgWhere(crew?: string | null, team?: string | null): Prisma.EstimateWhereInput {
  if (team) return { teamId: team };
  if (crew) return { team: { crewId: crew } };
  return {};
}

export async function POST(request: Request) {
  const { session, error } = await requireUser();
  if (error) return error;
  const forbidden = requireFeature(session!.user.role, "calibration.apply", "RW");
  if (forbidden) return forbidden;
  const body = await request.json().catch(() => ({}));
  const levelIds = Array.isArray(body.levelIds) ? (body.levelIds as string[]) : null;
  const crew = typeof body.crew === "string" ? body.crew : null;
  const team = typeof body.team === "string" ? body.team : null;
  const scope = await resolveEstimateScope(fromSession(session!.user));
  const [config, calibration] = await Promise.all([
    getActiveConfig(),
    getCalibration({ ...scope, ...orgWhere(crew, team) }),
  ]);
  const resourceLevels = config.resourceLevels.map((level) => {
    const row = calibration.rows.find((r) => r.id === level.id);
    const apply = row?.suggestedDaysPerPoint != null && (!levelIds || levelIds.includes(level.id));
    return apply && row.suggestedDaysPerPoint != null
      ? { ...level, daysPerPoint: row.suggestedDaysPerPoint }
      : level;
  });
  const next = await patchActiveConfig({ resourceLevels }, session!.user.id);
  return NextResponse.json({
    config: next,
    applied: calibration.rows.filter((r) => r.suggestedDaysPerPoint != null),
  });
}
