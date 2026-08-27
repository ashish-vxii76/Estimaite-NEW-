import { NextResponse } from "next/server";
import { requireFeature, requireUser } from "@/lib/api-auth";
import {
  createOrgUnit,
  getOrgTree,
  setTeamCrew,
  updateOrgUnit,
  upsertPrimarySeat,
} from "@/services/orgService";
import { ORG_SEAT_TYPES, ORG_TYPES, type OrgSeatType, type OrgType } from "@/lib/orgTypes";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const { session, error } = await requireUser();
  if (error) return error;
  const forbidden = requireFeature(session!.user.role, "org.setup", "R");
  if (forbidden) return forbidden;
  const [units, teams, seats] = await Promise.all([
    getOrgTree(),
    prisma.team.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, crewId: true, active: true },
    }),
    prisma.orgSeat.findMany({
      where: { isPrimary: true },
      include: {
        user: { select: { id: true, email: true, name: true, role: true } },
        orgUnit: true,
      },
    }),
  ]);
  return NextResponse.json({ units, teams, seats });
}

export async function POST(request: Request) {
  const { session, error } = await requireUser();
  if (error) return error;
  const forbidden = requireFeature(session!.user.role, "org.setup", "RW");
  if (forbidden) return forbidden;
  const body = await request.json();
  const action = String(body.action ?? "createUnit");

  try {
    if (action === "createUnit") {
      const type = body.type as OrgType;
      if (!ORG_TYPES.includes(type)) {
        return NextResponse.json({ error: "Invalid type" }, { status: 400 });
      }
      const unit = await createOrgUnit({
        type,
        name: String(body.name ?? ""),
        parentId: body.parentId ? String(body.parentId) : null,
      });
      await prisma.auditEvent.create({
        data: {
          userId: session!.user.id,
          action: "ORG_UNIT_CREATED",
          newValue: JSON.stringify(unit),
        },
      });
      return NextResponse.json({ unit });
    }
    if (action === "updateUnit") {
      const unit = await updateOrgUnit(String(body.id), {
        name: body.name != null ? String(body.name) : undefined,
        active: body.active != null ? Boolean(body.active) : undefined,
        parentId: body.parentId === undefined ? undefined : body.parentId ? String(body.parentId) : null,
      });
      return NextResponse.json({ unit });
    }
    if (action === "setTeamCrew") {
      const team = await setTeamCrew(
        String(body.teamId),
        body.crewId ? String(body.crewId) : null,
      );
      return NextResponse.json({ team });
    }
    if (action === "setPrimarySeat") {
      const seatType = String(body.seatType) as OrgSeatType;
      if (!ORG_SEAT_TYPES.includes(seatType)) {
        return NextResponse.json({ error: "Invalid seat type" }, { status: 400 });
      }
      const seat = await upsertPrimarySeat({
        userId: String(body.userId),
        orgUnitId: String(body.orgUnitId),
        seatType,
      });
      return NextResponse.json({ seat });
    }
    if (action === "addMember") {
      const name = String(body.name ?? "").trim();
      if (!name) return NextResponse.json({ error: "Member name is required" }, { status: 400 });
      const member = await prisma.teamMember.create({
        data: {
          teamId: String(body.teamId),
          name,
          roleStream: String(body.roleStream ?? "DEV"),
          resourceLevel: String(body.resourceLevel ?? ""),
          location: String(body.location ?? "India"),
        },
      });
      await prisma.auditEvent.create({
        data: { userId: session!.user.id, action: "TEAM_MEMBER_ADDED", newValue: `${member.teamId}:${name}` },
      });
      return NextResponse.json({ member });
    }
    if (action === "removeMember") {
      await prisma.teamMember.delete({ where: { id: String(body.memberId) } });
      await prisma.auditEvent.create({
        data: { userId: session!.user.id, action: "TEAM_MEMBER_REMOVED", newValue: String(body.memberId) },
      });
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
