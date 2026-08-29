import { NextResponse } from "next/server";
import { requireFeature, requireUser, requireVisibleEstimate } from "@/lib/api-auth";
import { descopeEstimate } from "@/services/estimateService";
import { apiError } from "@/lib/api-error";

// DEC-008 L2 (D2): governed whole-CR descoping. Dedicated RBAC grant estimates.descope,
// mandatory reason, immutable audit. Excludes the CR from calibration; preserves all history.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireUser();
  if (error) return error;
  const forbidden = requireFeature(session!.user.role, "estimates.descope", "RW");
  if (forbidden) return forbidden;
  const { id } = await params;
  const visible = await requireVisibleEstimate(session!.user, id);
  if (visible.error) return visible.error;

  const body = await request.json().catch(() => ({}));
  const reason = String(body.comment ?? body.reason ?? "").trim();
  if (!reason) {
    return NextResponse.json({ error: "A descoping reason is required" }, { status: 400 });
  }
  try {
    const estimate = await descopeEstimate(id, reason, session!.user.id, session!.user.email ?? "");
    return NextResponse.json({ estimate });
  } catch (e) {
    return apiError(e);
  }
}
