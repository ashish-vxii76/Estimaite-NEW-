import { NextResponse } from "next/server";
import { requireFeature, requireUser } from "@/lib/api-auth";
import { fromSession } from "@/lib/scope";
import { adminVisibleCrewIds } from "@/services/orgService";
import { getActiveConfig, patchActiveConfig } from "@/services/configService";
import { prisma } from "@/lib/prisma";

// DEC-009 D7 Class-A: per-crew Resource Levels (Days/Point). Persists via the existing golden-safe
// crewDaysPerPoint override seam (DEC-007 A5) — an empty map resolves identically to global, so
// Golden Case A/B are unaffected. Governed Class-B mappings/thresholds are NOT touched here.

async function crewOptions(userScope: ReturnType<typeof fromSession>) {
  const ids = await adminVisibleCrewIds(userScope);
  const crews = await prisma.orgUnit.findMany({
    where: { type: "CREW", active: true, ...(ids == null ? {} : { id: { in: ids } }) },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  return crews;
}

export async function GET() {
  const { session, error } = await requireUser();
  if (error) return error;
  const forbidden = requireFeature(session!.user.role, "config.crewLevels", "R");
  if (forbidden) return forbidden;

  const config = await getActiveConfig();
  const crews = await crewOptions(fromSession(session!.user));
  return NextResponse.json({
    resourceLevels: config.resourceLevels.map((l) => ({
      id: l.id,
      name: l.name,
      capacitySpPerSprint: l.capacitySpPerSprint,
      daysPerPoint: l.daysPerPoint,
    })),
    overrides: config.crewDaysPerPoint ?? {},
    capacityOverrides: config.crewCapacitySpPerSprint ?? {},
    crews,
  });
}

export async function POST(request: Request) {
  const { session, error } = await requireUser();
  if (error) return error;
  const forbidden = requireFeature(session!.user.role, "config.crewLevels", "RW");
  if (forbidden) return forbidden;

  const body = await request.json();
  const crewId = String(body.crewId ?? "");
  // { levelId: number | null }  — null/absent clears the override (inherit global)
  const incoming = (body.overrides ?? {}) as Record<string, number | null>;
  const incomingCap = (body.capacityOverrides ?? {}) as Record<string, number | null>;

  // Scope: the crew must be one the actor can see.
  const visible = await adminVisibleCrewIds(fromSession(session!.user));
  if (visible && !visible.includes(crewId)) {
    return NextResponse.json({ error: "Crew outside your org scope" }, { status: 403 });
  }
  const crew = await prisma.orgUnit.findUnique({ where: { id: crewId }, select: { type: true } });
  if (!crew || crew.type !== "CREW") {
    return NextResponse.json({ error: "Not a crew" }, { status: 400 });
  }

  const config = await getActiveConfig();
  const validLevelIds = new Set(config.resourceLevels.map((l) => l.id));

  // Build this crew's override map from the submitted values, validating each.
  const crewMap: Record<string, number> = {};
  for (const [levelId, raw] of Object.entries(incoming)) {
    if (!validLevelIds.has(levelId)) {
      return NextResponse.json({ error: `Unknown resource level: ${levelId}` }, { status: 400 });
    }
    if (raw == null || raw === ("" as unknown as number)) continue; // cleared → inherit global
    const val = Number(raw);
    if (!Number.isFinite(val) || val <= 0) {
      return NextResponse.json({ error: `Days/Point for ${levelId} must be a positive number` }, { status: 400 });
    }
    crewMap[levelId] = val;
  }

  // Same validation for capacity/sprint overrides.
  const crewCapMap: Record<string, number> = {};
  for (const [levelId, raw] of Object.entries(incomingCap)) {
    if (!validLevelIds.has(levelId)) {
      return NextResponse.json({ error: `Unknown resource level: ${levelId}` }, { status: 400 });
    }
    if (raw == null || raw === ("" as unknown as number)) continue; // cleared → inherit global
    const val = Number(raw);
    if (!Number.isFinite(val) || val <= 0) {
      return NextResponse.json({ error: `Capacity for ${levelId} must be a positive number` }, { status: 400 });
    }
    crewCapMap[levelId] = val;
  }

  const allOverrides: Record<string, Record<string, number>> = { ...(config.crewDaysPerPoint ?? {}) };
  if (Object.keys(crewMap).length === 0) {
    delete allOverrides[crewId]; // fully inherit → remove the crew entry (stays golden-safe)
  } else {
    allOverrides[crewId] = crewMap;
  }

  const allCap: Record<string, Record<string, number>> = { ...(config.crewCapacitySpPerSprint ?? {}) };
  if (Object.keys(crewCapMap).length === 0) {
    delete allCap[crewId];
  } else {
    allCap[crewId] = crewCapMap;
  }

  await patchActiveConfig(
    { crewDaysPerPoint: allOverrides, crewCapacitySpPerSprint: allCap },
    session!.user.id,
  );
  return NextResponse.json({
    ok: true,
    overrides: allOverrides[crewId] ?? {},
    capacityOverrides: allCap[crewId] ?? {},
  });
}
