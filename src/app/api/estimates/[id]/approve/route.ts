import { NextResponse } from "next/server";
import { requireRole, requireUser } from "@/lib/api-auth";
import { transitionStatus } from "@/services/estimateService";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireUser();
  if (error) return error;
  const forbidden = requireRole(session!.user.role, ["APPROVER", "REVIEWER"]);
  if (forbidden) return forbidden;
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  try {
    const estimate = await transitionStatus(
      id,
      "approve",
      session!.user.id,
      session!.user.email ?? "",
      body.comment ?? "",
    );
    return NextResponse.json({ estimate });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
