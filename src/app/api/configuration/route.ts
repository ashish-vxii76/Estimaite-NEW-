import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFeature, requireUser } from "@/lib/api-auth";
import { getActiveConfig, saveConfigVersion } from "@/services/configService";
import { can } from "@/lib/access";

export async function GET() {
  const { session, error } = await requireUser();
  if (error) return error;
  if (
    !can(session!.user.role, "config.mappings") &&
    !can(session!.user.role, "config.rates") &&
    !can(session!.user.role, "config.teams")
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const [config, locations, versions] = await Promise.all([
    getActiveConfig(),
    prisma.location.findMany({ where: { active: true } }),
    prisma.configurationVersion.findMany({ orderBy: { createdAt: "desc" }, take: 20 }),
  ]);
  return NextResponse.json({ config, locations, versions });
}

export async function POST(request: Request) {
  const { session, error } = await requireUser();
  if (error) return error;
  const forbidden = requireFeature(session!.user.role, "config.mappings", "RW");
  if (forbidden) return forbidden;
  const body = await request.json();
  const next = await saveConfigVersion(body.config, session!.user.id);
  return NextResponse.json({ config: next });
}
