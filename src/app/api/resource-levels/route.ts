import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { getActiveConfig } from "@/services/configService";

export async function GET() {
  const { error } = await requireUser();
  if (error) return error;
  const config = await getActiveConfig();
  return NextResponse.json({ resourceLevels: config.resourceLevels });
}
