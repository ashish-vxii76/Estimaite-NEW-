import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFeature, requireUser } from "@/lib/api-auth";
import { createEstimate, estimateInputSchema } from "@/services/estimateService";
import { assertTeamAccess, fromSession, resolveEstimateScope } from "@/lib/scope";

export async function GET(request: Request) {
  const { session, error } = await requireUser();
  if (error) return error;
  const forbidden = requireFeature(session!.user.role, "estimates.list");
  if (forbidden) return forbidden;
  // #13: bound the query. Optional ?limit=&offset=; default cap avoids an unbounded scan.
  const url = new URL(request.url);
  const limit = Math.min(500, Math.max(1, Number(url.searchParams.get("limit")) || 200));
  const offset = Math.max(0, Number(url.searchParams.get("offset")) || 0);
  const where = await resolveEstimateScope(fromSession(session!.user));
  const [estimates, total] = await Promise.all([
    prisma.estimate.findMany({
      where,
      include: { team: true, createdBy: true },
      orderBy: { updatedAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.estimate.count({ where }),
  ]);
  return NextResponse.json({ estimates, total, limit, offset });
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
