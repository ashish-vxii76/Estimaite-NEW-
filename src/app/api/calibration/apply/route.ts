import { NextResponse } from "next/server";
import { requireFeature, requireUser } from "@/lib/api-auth";
import { getActiveConfig, patchActiveConfig } from "@/services/configService";
import { computeCrewCalibration } from "@/services/portfolioService";
import { appendAuditEvent } from "@/services/auditService";
import { fromSession, resolveEstimateScope } from "@/lib/scope";
import { lockedOrgPathForUser } from "@/lib/lockedOrgPath";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

type ScopeUser = {
  id: string;
  role: string;
  teamId?: string | null;
  seatOrgUnitId?: string | null;
  activeGrantId?: string | null;
};

async function calibrationWhere(
  user: ScopeUser,
  crewId: string,
): Promise<Prisma.EstimateWhereInput> {
  const scope = await resolveEstimateScope(fromSession(user));
  // A5 applies per crew, so the sample set is that crew's CRs (intersected with the user's scope).
  return { ...scope, team: { crewId } };
}

// DEC-007 A5: apply calibration as a PER-CREW Days/Point override (never the global default).
// Suggestions come from the crew's eligible history shrunk toward its org ancestors; each move is
// gated by the ±20% guardrail unless an authorised override is supplied. The change is written as a
// new versioned config (governed + audited).
export async function POST(request: Request) {
  const { session, error } = await requireUser();
  if (error) return error;
  const forbidden = requireFeature(session!.user.role, "calibration.apply", "RW");
  if (forbidden) return forbidden;

  const body = await request.json().catch(() => ({}));
  const levelIds = Array.isArray(body.levelIds) ? (body.levelIds as string[]) : null;
  const override = body.override === true; // authorised move beyond the ±20% guardrail
  const user = session!.user as ScopeUser;

  // Resolve the target crew: explicit crewId, else the selected team's crew, else the locked crew.
  let crewId: string | null = typeof body.crewId === "string" ? body.crewId : null;
  if (!crewId && typeof body.team === "string" && body.team) {
    const team = await prisma.team.findUnique({ where: { id: body.team }, select: { crewId: true } });
    crewId = team?.crewId ?? null;
  }
  if (!crewId) {
    const locked = await lockedOrgPathForUser(user.id, {
      activeGrantId: user.activeGrantId,
      seatOrgUnitId: user.seatOrgUnitId,
    });
    crewId = locked.crewId;
  }
  if (!crewId) {
    return NextResponse.json(
      { error: "Select a crew to apply per-crew calibration" },
      { status: 400 },
    );
  }

  const config = await getActiveConfig();
  const crewCal = await computeCrewCalibration(crewId, await calibrationWhere(user, crewId));

  const overrides: Record<string, Record<string, number>> = { ...(config.crewDaysPerPoint ?? {}) };
  const crewMap: Record<string, number> = { ...(overrides[crewId] ?? {}) };
  const applied: typeof crewCal.rows = [];
  const blockedByGuardrail: typeof crewCal.rows = [];
  for (const row of crewCal.rows) {
    if (row.samples === 0) continue; // no evidence for this level → leave as-is (inherits global)
    if (levelIds && !levelIds.includes(row.id)) continue;
    if (!row.withinGuardrail && !override) {
      blockedByGuardrail.push(row);
      continue;
    }
    crewMap[row.id] = row.suggestedDaysPerPoint;
    applied.push(row);
  }

  if (applied.length === 0) {
    return NextResponse.json({
      crewId,
      applied: [],
      blockedByGuardrail,
      message: blockedByGuardrail.length
        ? "All suggested moves exceed the ±20% guardrail — an authorised override is required."
        : "No eligible evidence to apply.",
    });
  }

  overrides[crewId] = crewMap;
  const next = await patchActiveConfig({ crewDaysPerPoint: overrides }, user.id);
  await appendAuditEvent({
    userId: user.id,
    action: "CALIBRATION_APPLIED",
    previousValue: config.versionId,
    newValue: JSON.stringify({
      crewId,
      override,
      applied: applied.map((r) => ({
        level: r.id,
        from: r.currentDaysPerPoint,
        to: r.suggestedDaysPerPoint,
      })),
    }),
  });

  return NextResponse.json({ config: next, crewId, applied, blockedByGuardrail });
}
