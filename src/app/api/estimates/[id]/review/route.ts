import { NextResponse } from "next/server";
import { requireFeature, requireUser, requireVisibleEstimate } from "@/lib/api-auth";
import { transitionStatus } from "@/services/estimateService";
import { apiError } from "@/lib/api-error";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireUser();
  if (error) return error;
  const forbidden = requireFeature(session!.user.role, "estimates.review", "RW");
  if (forbidden) return forbidden;
  const { id } = await params;
  const visible = await requireVisibleEstimate(session!.user, id);
  if (visible.error) return visible.error;
  const body = await request.json().catch(() => ({}));
  try {
    const estimate = await transitionStatus(
      id,
      "review",
      session!.user.id,
      session!.user.email ?? "",
      body.comment ?? "",
    );
    return NextResponse.json({ estimate });
  } catch (e) {
    return apiError(e);
  }
}
