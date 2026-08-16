import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-auth";
import { createEstimate, estimateInputSchema } from "@/services/estimateService";

export async function GET() {
  const { session, error } = await requireUser();
  if (error) return error;
  const estimates = await prisma.estimate.findMany({
    include: { team: true, createdBy: true },
    orderBy: { updatedAt: "desc" },
  });
  void session;
  return NextResponse.json({ estimates });
}

export async function POST(request: Request) {
  const { session, error } = await requireUser();
  if (error) return error;
  const body = await request.json();
  const parsed = estimateInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const estimate = await createEstimate(parsed.data, session!.user.id);
  return NextResponse.json({ estimate }, { status: 201 });
}
