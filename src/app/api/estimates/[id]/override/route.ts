import { NextResponse } from "next/server";
import { requireFeature, requireUser, requireVisibleEstimate } from "@/lib/api-auth";
import { applyOverride } from "@/services/estimateService";
import { writesOwnRecordsOnly } from "@/lib/rbac";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireUser();
  if (error) return error;
  const forbidden = requireFeature(session!.user.role, "estimates.edit", "RW");
  if (forbidden) return forbidden;
  const { id } = await params;
  const visible = await requireVisibleEstimate(session!.user, id);
  if (visible.error) return visible.error;
  if (writesOwnRecordsOnly(session!.user.role) && visible.estimate!.createdById !== session!.user.id) {
    return NextResponse.json({ error: "You can only override records you authored" }, { status: 403 });
  }
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
