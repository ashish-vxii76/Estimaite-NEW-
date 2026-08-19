import { NextResponse } from "next/server";
import { requireFeature, requireUser } from "@/lib/api-auth";
import { getCalibration } from "@/services/portfolioService";
import { estimateScope, fromSession } from "@/lib/scope";

export async function GET() {
  const { session, error } = await requireUser();
  if (error) return error;
  const forbidden = requireFeature(session!.user.role, "calibration.view");
  if (forbidden) return forbidden;
  const data = await getCalibration(estimateScope(fromSession(session!.user)));
  return NextResponse.json(data);
}
