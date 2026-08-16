import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { getPortfolio } from "@/services/portfolioService";

export async function GET() {
  const { error } = await requireUser();
  if (error) return error;
  const data = await getPortfolio();
  return NextResponse.json(data);
}
