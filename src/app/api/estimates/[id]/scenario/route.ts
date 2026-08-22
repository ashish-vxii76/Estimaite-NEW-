import { NextResponse } from "next/server";
import { z } from "zod";
import { requireFeature, requireUser, requireVisibleEstimate } from "@/lib/api-auth";
import { saveEstimateScenario } from "@/services/estimateService";

const schema = z.object({
  objective: z.string().min(1),
  maxSprints: z.number().nullable().optional(),
  selectedTeamId: z.string().min(1),
  scenario: z.object({
    selected: z.any(),
    byTeam: z.array(z.any()),
    recommended: z.any().nullable(),
  }),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireUser();
  if (error) return error;
  const forbidden = requireFeature(session!.user.role, "whatIf", "RW");
  if (forbidden) return forbidden;
  const { id } = await params;
  const visible = await requireVisibleEstimate(session!.user, id);
  if (visible.error) return visible.error;
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  try {
    const data = await saveEstimateScenario(id, parsed.data, session!.user.id);
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
