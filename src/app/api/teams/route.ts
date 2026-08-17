import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFeature, requireUser } from "@/lib/api-auth";
import { fromSession, teamsForUser } from "@/lib/scope";

export async function GET() {
  const { session, error } = await requireUser();
  if (error) return error;
  const forbidden = requireFeature(session!.user.role, "config.teams");
  if (forbidden) return forbidden;
  const teams = await teamsForUser(fromSession(session!.user));
  return NextResponse.json({ teams });
}

export async function POST(request: Request) {
  const { session, error } = await requireUser();
  if (error) return error;
  const forbidden = requireFeature(session!.user.role, "config.teams", "RW");
  if (forbidden) return forbidden;
  const body = await request.json();
  const name = String(body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "Team name is required" }, { status: 400 });
  const existing = await prisma.team.findUnique({ where: { name } });
  if (existing) return NextResponse.json({ error: "A team with that name already exists" }, { status: 400 });
  const team = await prisma.team.create({
    data: {
      name,
      mappedLocation: String(body.mappedLocation ?? "India"),
      standardTeamSize: Number(body.standardTeamSize ?? 10),
      currency: String(body.currency ?? "CHF"),
      teamSprintRate: Number(body.teamSprintRate ?? 25000),
      resourceSprintRate: Number(body.resourceSprintRate ?? 2500),
      costMethod: "Resource Cost per Sprint",
      effectiveFrom: new Date(),
      active: true,
    },
  });
  return NextResponse.json({ team }, { status: 201 });
}
