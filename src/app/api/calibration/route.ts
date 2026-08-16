import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { getCalibration } from "@/services/portfolioService";

export async function GET() {
  const { error } = await requireUser();
  if (error) return error;
  const data = await getCalibration();
  return NextResponse.json(data);
}
