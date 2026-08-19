import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-auth";

export async function GET() {
  const { error } = await requireUser();
  if (error) return error;
  const locations = await prisma.location.findMany({ where: { active: true } });
  return NextResponse.json({ locations });
}
