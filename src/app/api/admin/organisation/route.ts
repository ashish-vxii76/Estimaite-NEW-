import { NextResponse } from "next/server";
import { requireFeature, requireUser } from "@/lib/api-auth";
import {
  adminOrgScope,
  canArchiveUnit,
  canCreateUnderParent,
  canWriteUnit,
  createOrgUnit,
  getOrgTree,
  setTeamCrew,
  updateOrgUnit,
  upsertPrimarySeat,
} from "@/services/orgService";
import { ORG_SEAT_TYPES, ORG_TYPES, type OrgSeatType, type OrgType } from "@/lib/orgTypes";
import { prisma } from "@/lib/prisma";
import { appendAuditEvent } from "@/services/auditService";

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

  // DEC-016: administration authority is scoped to the actor's seat/grant subtree. A crew-anchored
  // admin can manage Pods/members under their crew and edit the crew, but cannot create Companies/
  // Divisions/Crews or archive units at or above their anchor. Enforced server-side (deny by default).
  const scope = await adminOrgScope(session!.user);
  const deny = () => NextResponse.json({ error: "Outside your administration scope" }, { status: 403 });
  const crewIdOfTeam = async (teamId: string) =>
    (await prisma.team.findUnique({ where: { id: teamId }, select: { crewId: true } }))?.crewId ?? null;

  try {
    if (action === "createUnit") {
      const type = body.type as OrgType;
      if (!ORG_TYPES.includes(type)) {
        return NextResponse.json({ error: "Invalid type" }, { status: 400 });
      }
      const parentId = body.parentId ? String(body.parentId) : null;
      if (!canCreateUnderParent(scope, parentId)) return deny();
      const unit = await createOrgUnit({
        type,
        name: String(body.name ?? ""),
        parentId,
      });
      await appendAuditEvent({
        userId: session!.user.id,
        action: "ORG_UNIT_CREATED",
        newValue: JSON.stringify(unit),
      });
      return NextResponse.json({ unit });
    }
    if (action === "updateUnit") {
      const id = String(body.id);
      const archiving = body.active === false;
      // Archive/deactivate needs strict-descendant authority; detail edits need write authority.
      if (archiving ? !canArchiveUnit(scope, id) : !canWriteUnit(scope, id)) return deny();
      // Re-parenting must also land under a parent in scope.
      if (body.parentId !== undefined && !canCreateUnderParent(scope, body.parentId ? String(body.parentId) : null)) {
        return deny();
      }
      const unit = await updateOrgUnit(id, {
        name: body.name != null ? String(body.name) : undefined,
        active: body.active != null ? Boolean(body.active) : undefined,
        parentId: body.parentId === undefined ? undefined : body.parentId ? String(body.parentId) : null,
        currency: body.currency != null ? String(body.currency) : undefined,
      });
      return NextResponse.json({ unit });
    }
    if (action === "setTeamCrew") {
      const teamId = String(body.teamId);
      const newCrewId = body.crewId ? String(body.crewId) : null;
      const currentCrewId = await crewIdOfTeam(teamId);
      // Both the pod's current crew and its destination crew must be in scope.
      if (currentCrewId && !canWriteUnit(scope, currentCrewId)) return deny();
      if (newCrewId && !canWriteUnit(scope, newCrewId)) return deny();
      const team = await setTeamCrew(teamId, newCrewId);
      return NextResponse.json({ team });
    }
    if (action === "setPrimarySeat") {
      const seatType = String(body.seatType) as OrgSeatType;
      if (!ORG_SEAT_TYPES.includes(seatType)) {
        return NextResponse.json({ error: "Invalid seat type" }, { status: 400 });
      }
      const seatUnitId = String(body.orgUnitId);
      if (!canWriteUnit(scope, seatUnitId)) return deny();
      const seat = await upsertPrimarySeat({
        userId: String(body.userId),
        orgUnitId: seatUnitId,
        seatType,
      });
      return NextResponse.json({ seat });
    }
    if (action === "removeSeat") {
      const existingSeat = await prisma.orgSeat.findUnique({
        where: { id: String(body.seatId) },
        select: { orgUnitId: true },
      });
      if (!existingSeat || !canWriteUnit(scope, existingSeat.orgUnitId)) return deny();
      await prisma.orgSeat.delete({ where: { id: String(body.seatId) } });
      await appendAuditEvent({ userId: session!.user.id, action: "ORG_SEAT_REMOVED", newValue: String(body.seatId) });
      return NextResponse.json({ ok: true });
    }
    if (action === "addMember") {
      const name = String(body.name ?? "").trim();
      if (!name) return NextResponse.json({ error: "Member name is required" }, { status: 400 });
      const memberCrewId = await crewIdOfTeam(String(body.teamId));
      if (memberCrewId && !canWriteUnit(scope, memberCrewId)) return deny();
      const member = await prisma.teamMember.create({
        data: {
          teamId: String(body.teamId),
          name,
          roleStream: String(body.roleStream ?? "DEV"),
          resourceLevel: String(body.resourceLevel ?? ""),
          location: String(body.location ?? "India"),
        },
      });
      await appendAuditEvent({ userId: session!.user.id, action: "TEAM_MEMBER_ADDED", newValue: `${member.teamId}:${name}` });
      return NextResponse.json({ member });
    }
    if (action === "removeMember") {
      const mem = await prisma.teamMember.findUnique({
        where: { id: String(body.memberId) },
        select: { team: { select: { crewId: true } } },
      });
      const mcrew = mem?.team?.crewId ?? null;
      if (mcrew && !canWriteUnit(scope, mcrew)) return deny();
      await prisma.teamMember.delete({ where: { id: String(body.memberId) } });
      await appendAuditEvent({ userId: session!.user.id, action: "TEAM_MEMBER_REMOVED", newValue: String(body.memberId) });
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
