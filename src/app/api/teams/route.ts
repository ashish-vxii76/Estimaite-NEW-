import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFeature, requireUser } from "@/lib/api-auth";
import { fromSession, teamsForUser } from "@/lib/scope";
import { resolveOrgCurrency } from "@/services/orgService";

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
  const crewId = body.crewId ? String(body.crewId) : null;
  // New pods inherit the organisation (Company) currency of their crew unless one is given.
  const currency = body.currency
    ? String(body.currency)
    : crewId
      ? await resolveOrgCurrency({ crewIds: [crewId] })
      : "CHF";
  const team = await prisma.team.create({
    data: {
      name,
      mappedLocation: String(body.mappedLocation ?? "India"),
      standardTeamSize: Number(body.standardTeamSize ?? 10),
      currency,
      teamSprintRate: Number(body.teamSprintRate ?? 25000),
      resourceSprintRate: Number(body.resourceSprintRate ?? 2500),
      costMethod: "Resource Cost per Sprint",
      effectiveFrom: new Date(),
      active: true,
      ...(crewId ? { crewId } : {}),
    },
  });
  return NextResponse.json({ team }, { status: 201 });
}
