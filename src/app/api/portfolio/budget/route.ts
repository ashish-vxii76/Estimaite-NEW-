import { NextResponse } from "next/server";
import { requireFeature, requireUser } from "@/lib/api-auth";
import { setPortfolioBudget } from "@/services/portfolioService";

export async function PUT(request: Request) {
  const { session, error } = await requireUser();
  if (error) return error;
  const forbidden = requireFeature(session!.user.role, "portfolio.budget", "RW");
  if (forbidden) return forbidden;
  const body = await request.json();
  const budget = body.budget === "" || body.budget == null ? null : Number(body.budget);
  if (budget != null && (Number.isNaN(budget) || budget < 0)) {
    return NextResponse.json({ error: "Budget cannot be negative" }, { status: 400 });
  }
  const settings = await setPortfolioBudget(budget, String(body.currency ?? "CHF"));
  return NextResponse.json({ settings });
}
