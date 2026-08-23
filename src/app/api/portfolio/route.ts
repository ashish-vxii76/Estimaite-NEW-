import { NextResponse } from "next/server";
import { requireFeature, requireUser } from "@/lib/api-auth";
import { getPortfolio } from "@/services/portfolioService";
import { fromSession, resolveEstimateScope } from "@/lib/scope";

export async function GET() {
  const { session, error } = await requireUser();
  if (error) return error;
  const forbidden = requireFeature(session!.user.role, "portfolio.view");
  if (forbidden) return forbidden;
  const data = await getPortfolio({
    scope: await resolveEstimateScope(fromSession(session!.user)),
    user: fromSession(session!.user),
  });
  return NextResponse.json(data);
}
