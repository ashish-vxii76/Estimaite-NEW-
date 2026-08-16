import { NextResponse } from "next/server";
import { requireRole, requireUser } from "@/lib/api-auth";
import { applyOverride } from "@/services/estimateService";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireUser();
  if (error) return error;
  const forbidden = requireRole(session!.user.role, ["APPROVER", "REVIEWER", "ESTIMATOR"]);
  if (forbidden) return forbidden;
  const { id } = await params;
  const body = await request.json();
  try {
    const data = await applyOverride(
      id,
      {
        overrideSp: Number(body.overrideSp),
        reason: String(body.reason ?? ""),
        requestedBy: session!.user.email ?? session!.user.name ?? "unknown",
      },
      session!.user.id,
    );
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
