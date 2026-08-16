import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, requireUser } from "@/lib/api-auth";

export async function GET() {
  const { error } = await requireUser();
  if (error) return error;
  const members = await prisma.teamMember.findMany({
    include: { team: true },
    orderBy: [{ teamId: "asc" }, { name: "asc" }],
  });
  return NextResponse.json({
    members: members.map((m) => ({
      id: m.id,
      teamId: m.teamId,
      teamName: m.team.name,
      name: m.name,
      resourceLevel: m.resourceLevel,
      roleStream: m.roleStream,
      location: m.location,
    })),
  });
}

export async function PUT(request: Request) {
  const { session, error } = await requireUser();
  if (error) return error;
  const forbidden = requireRole(session!.user.role, ["ADMINISTRATOR"]);
  if (forbidden) return forbidden;
  const body = await request.json();
  const members = (body.members ?? []) as {
    teamId: string;
    name: string;
    resourceLevel: string;
    roleStream: string;
    location: string;
  }[];
  await prisma.teamMember.deleteMany();
  if (members.length) {
    await prisma.teamMember.createMany({
      data: members.map((m) => ({
        teamId: m.teamId,
        name: m.name,
        resourceLevel: m.resourceLevel,
        roleStream: m.roleStream,
        location: m.location,
      })),
    });
  }
  await prisma.auditEvent.create({
    data: {
      userId: session!.user.id,
      action: "TEAM_COMPOSITION_UPDATED",
      newValue: String(members.length),
    },
  });
  return NextResponse.json({ ok: true, count: members.length });
}
