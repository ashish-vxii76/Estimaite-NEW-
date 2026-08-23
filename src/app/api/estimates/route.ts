import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFeature, requireUser } from "@/lib/api-auth";
import { createEstimate, estimateInputSchema } from "@/services/estimateService";
import { assertTeamAccess, fromSession, resolveEstimateScope } from "@/lib/scope";

export async function GET() {
  const { session, error } = await requireUser();
  if (error) return error;
  const forbidden = requireFeature(session!.user.role, "estimates.list");
  if (forbidden) return forbidden;
  const estimates = await prisma.estimate.findMany({
    where: await resolveEstimateScope(fromSession(session!.user)),
    include: { team: true, createdBy: true },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json({ estimates });
}

export async function POST(request: Request) {
  const { session, error } = await requireUser();
  if (error) return error;
  const forbidden = requireFeature(session!.user.role, "estimates.create", "RW");
  if (forbidden) return forbidden;
  const body = await request.json();
  const parsed = estimateInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  try {
    await assertTeamAccess(fromSession(session!.user), parsed.data.teamId);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 403 });
  }
  const estimate = await createEstimate(parsed.data, session!.user.id);
  return NextResponse.json({ estimate }, { status: 201 });
}
