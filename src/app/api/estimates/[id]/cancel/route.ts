import { NextResponse } from "next/server";
import { requireFeature, requireUser, requireVisibleEstimate } from "@/lib/api-auth";
import { transitionStatus } from "@/services/estimateService";
import { apiError } from "@/lib/api-error";

// DEC-008 L1: cancel a CR. Dedicated RBAC grant estimates.cancel, mandatory reason, governed
// terminal transition (in-flight states only). Preserves the CR, baseline, versions, actuals and
// audit history — this is NOT delete/archive.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireUser();
  if (error) return error;
  const forbidden = requireFeature(session!.user.role, "estimates.cancel", "RW");
  if (forbidden) return forbidden;
  const { id } = await params;
  const visible = await requireVisibleEstimate(session!.user, id);
  if (visible.error) return visible.error;

  const body = await request.json().catch(() => ({}));
  const reason = String(body.comment ?? body.reason ?? "").trim();
  if (!reason) {
    return NextResponse.json({ error: "A cancellation reason is required" }, { status: 400 });
  }
  try {
    const estimate = await transitionStatus(
      id,
      "cancel",
      session!.user.id,
      session!.user.email ?? "",
      reason,
    );
    return NextResponse.json({ estimate });
  } catch (e) {
    return apiError(e);
  }
}
