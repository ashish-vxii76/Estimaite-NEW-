import { NextResponse } from "next/server";
import { requireFeature, requireUser, requireVisibleEstimate } from "@/lib/api-auth";
import { calculateAndPersist } from "@/services/estimateService";
import { writesOwnRecordsOnly } from "@/lib/access";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireUser();
  if (error) return error;
  const forbidden = requireFeature(session!.user.role, "estimates.edit", "RW");
  if (forbidden) return forbidden;
  const { id } = await params;
  const visible = await requireVisibleEstimate(session!.user, id);
  if (visible.error) return visible.error;
  if (writesOwnRecordsOnly(session!.user.role) && visible.estimate!.createdById !== session!.user.id) {
    return NextResponse.json({ error: "You can only calculate records you authored" }, { status: 403 });
  }
  try {
    const data = await calculateAndPersist(id, session!.user.id);
    if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
