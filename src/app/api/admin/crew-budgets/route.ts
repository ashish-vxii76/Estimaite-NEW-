import { NextResponse } from "next/server";
import { requireFeature, requireUser } from "@/lib/api-auth";
import {
  deleteCrewBudget,
  listCrewBudgets,
  saveCrewBudget,
  visibleCrewIds,
} from "@/services/orgService";
import { can } from "@/lib/access";
import { listOrgUnits } from "@/services/orgService";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { session, error } = await requireUser();
  if (error) return error;
  const forbidden = requireFeature(session!.user.role, "org.budget", "R");
  if (forbidden) return forbidden;
  const yearParam = new URL(request.url).searchParams.get("year");
  const year = yearParam ? Number(yearParam) : undefined;
  const crewIds = await visibleCrewIds(session!.user);
  const [budgets, units] = await Promise.all([
    listCrewBudgets(year, crewIds),
    listOrgUnits(true),
  ]);
  return NextResponse.json({
    budgets,
    units,
    currency: "CHF",
    canWrite: can(session!.user.role, "org.budget", "RW"),
  });
}

export async function POST(request: Request) {
  const { session, error } = await requireUser();
  if (error) return error;
  const forbidden = requireFeature(session!.user.role, "org.budget", "RW");
  if (forbidden) return forbidden;
  const body = await request.json();
  const crewIds = await visibleCrewIds(session!.user);
  const crewId = String(body.crewId ?? "");
  if (crewIds && !crewIds.includes(crewId)) {
    return NextResponse.json({ error: "Crew outside your org scope" }, { status: 403 });
  }
  try {
    const budget = await saveCrewBudget({
      crewId,
      year: Number(body.year),
      amount: Number(body.amount),
      allowUpdate: Boolean(body.allowUpdate),
      actorUserId: session!.user.id,
    });
    return NextResponse.json({ budget });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const { session, error } = await requireUser();
  if (error) return error;
  const forbidden = requireFeature(session!.user.role, "org.budget", "RW");
  if (forbidden) return forbidden;
  const id = new URL(request.url).searchParams.get("id") ?? "";
  const budget = await prisma.crewBudget.findUnique({ where: { id }, select: { crewId: true } });
  if (!budget) return NextResponse.json({ error: "Budget not found" }, { status: 404 });
  const crewIds = await visibleCrewIds(session!.user);
  if (crewIds && !crewIds.includes(budget.crewId)) {
    return NextResponse.json({ error: "Crew outside your org scope" }, { status: 403 });
  }
  try {
    await deleteCrewBudget(id, session!.user.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
