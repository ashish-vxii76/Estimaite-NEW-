import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, requireUser } from "@/lib/api-auth";
import { getActiveConfig, saveConfigVersion } from "@/services/configService";

export async function GET() {
  const { error } = await requireUser();
  if (error) return error;
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
  const forbidden = requireRole(session!.user.role, ["ADMINISTRATOR"]);
  if (forbidden) return forbidden;
  const body = await request.json();
  const next = await saveConfigVersion(body.config, session!.user.id);
  return NextResponse.json({ config: next });
}
