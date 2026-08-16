import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-auth";

export async function GET() {
  const { error } = await requireUser();
  if (error) return error;
  const teams = await prisma.team.findMany({
    where: { active: true },
    include: { members: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ teams });
}
