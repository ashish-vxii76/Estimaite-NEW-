import { NextResponse } from "next/server";
import { requireFeature, requireUser, requireVisibleEstimate } from "@/lib/api-auth";
import { captureActuals } from "@/services/estimateService";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireUser();
  if (error) return error;
  const forbidden = requireFeature(session!.user.role, "estimates.actuals", "RW");
  if (forbidden) return forbidden;
  const { id } = await params;
  const visible = await requireVisibleEstimate(session!.user, id);
  if (visible.error) return visible.error;
  const body = await request.json();
  try {
    const data = await captureActuals(
      id,
      {
        actualDevPd: Number(body.actualDevPd),
        actualQaPd: Number(body.actualQaPd),
        actualSprints: Number(body.actualSprints),
        actualDevResources: Number(body.actualDevResources),
        actualQaResources: Number(body.actualQaResources),
        actualOtherCost: Number(body.actualOtherCost ?? 0),
        completionDate: body.completionDate,
      },
      session!.user.id,
    );
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
