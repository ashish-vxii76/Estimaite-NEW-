import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { calculateAndPersist } from "@/services/estimateService";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireUser();
  if (error) return error;
  const { id } = await params;
  try {
    const data = await calculateAndPersist(id, session!.user.id);
    if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
