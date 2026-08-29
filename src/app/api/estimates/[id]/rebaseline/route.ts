import { NextResponse } from "next/server";
import { requireFeature, requireUser, requireVisibleEstimate } from "@/lib/api-auth";
import { rebaselineEstimate } from "@/services/estimateService";
import { apiError } from "@/lib/api-error";

// DEC-008 L4 (D4/D6): governed re-baselining. Dedicated RBAC grant estimates.rebaseline (strongest
// governance), mandatory reason, immutable audit. Appends a new baseline version (preserving all
// prior) and makes the CR calibration-ineligible by derivation.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireUser();
  if (error) return error;
  const forbidden = requireFeature(session!.user.role, "estimates.rebaseline", "RW");
  if (forbidden) return forbidden;
  const { id } = await params;
  const visible = await requireVisibleEstimate(session!.user, id);
  if (visible.error) return visible.error;

  const body = await request.json().catch(() => ({}));
  const reason = String(body.comment ?? body.reason ?? "").trim();
  if (!reason) {
    return NextResponse.json({ error: "A re-baseline reason is required" }, { status: 400 });
  }
  try {
    const estimate = await rebaselineEstimate(id, reason, session!.user.id, session!.user.email ?? "");
    return NextResponse.json({ estimate });
  } catch (e) {
    return apiError(e);
  }
}
