import { NextResponse } from "next/server";
import { requireFeature, requireUser, requireVisibleEstimate } from "@/lib/api-auth";
import { transitionStatus } from "@/services/estimateService";
import { writesOwnRecordsOnly } from "@/lib/access";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireUser();
  if (error) return error;
  const forbidden = requireFeature(session!.user.role, "estimates.submit", "RW");
  if (forbidden) return forbidden;
  const { id } = await params;
  const visible = await requireVisibleEstimate(session!.user, id);
  if (visible.error) return visible.error;
  if (writesOwnRecordsOnly(session!.user.role) && visible.estimate!.createdById !== session!.user.id) {
    return NextResponse.json({ error: "You can only submit records you authored" }, { status: 403 });
  }
  const body = await request.json().catch(() => ({}));
  try {
    const estimate = await transitionStatus(
      id,
      "submit",
      session!.user.id,
      session!.user.email ?? "",
      body.comment ?? "",
    );
    return NextResponse.json({ estimate });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
