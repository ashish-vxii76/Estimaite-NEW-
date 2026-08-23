import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFeature, requireUser } from "@/lib/api-auth";
import { estimateInputSchema, updateEstimate } from "@/services/estimateService";
import { canSeeEstimateAsync, fromSession } from "@/lib/scope";
import { writesOwnRecordsOnly } from "@/lib/access";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireUser();
  if (error) return error;
  const forbidden = requireFeature(session!.user.role, "estimates.list");
  if (forbidden) return forbidden;
  const { id } = await params;
  const estimate = await prisma.estimate.findUnique({
    where: { id },
    include: {
      team: true,
      createdBy: true,
      approvals: { orderBy: { createdAt: "desc" } },
      actuals: true,
      auditEvents: { orderBy: { createdAt: "desc" }, take: 50 },
      versions: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  });
  if (!estimate) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!(await canSeeEstimateAsync(fromSession(session!.user), estimate))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return NextResponse.json({
    estimate: {
      ...estimate,
      result: estimate.resultJson ? JSON.parse(estimate.resultJson) : null,
      complexityScores: JSON.parse(estimate.complexityScoresJson),
      readiness: JSON.parse(estimate.readinessJson),
      locationMix: JSON.parse(estimate.locationMixJson),
    },
  });
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireUser();
  if (error) return error;
  const forbidden = requireFeature(session!.user.role, "estimates.edit", "RW");
  if (forbidden) return forbidden;
  const { id } = await params;
  const existing = await prisma.estimate.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!(await canSeeEstimateAsync(fromSession(session!.user), existing))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (writesOwnRecordsOnly(session!.user.role) && existing.createdById !== session!.user.id) {
    return NextResponse.json({ error: "You can only edit records you authored" }, { status: 403 });
  }
  const body = await request.json();
  const parsed = estimateInputSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  try {
    const estimate = await updateEstimate(id, parsed.data, session!.user.id);
    if (!estimate) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ estimate });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
