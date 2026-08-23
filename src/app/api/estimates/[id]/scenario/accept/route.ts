import { NextResponse } from "next/server";
import { z } from "zod";
import { requireFeature, requireUser, requireVisibleEstimate } from "@/lib/api-auth";
import { acceptEstimateScenario } from "@/services/estimateService";
import { can } from "@/lib/access";

const schema = z.object({
  source: z.enum(["selected", "recommended"]),
  applyTeam: z.boolean().default(false),
  mix: z.object({
    teamId: z.string().min(1),
    teamName: z.string().min(1),
    bestDevLevel: z.string().min(1),
    bestQaLevel: z.string().min(1),
    devCount: z.number().int().min(1),
    qaCount: z.number().int().min(1),
  }),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireUser();
  if (error) return error;
  const forbiddenWhatIf = requireFeature(session!.user.role, "whatIf", "RW");
  if (forbiddenWhatIf) return forbiddenWhatIf;
  if (!can(session!.user.role, "estimates.edit", "RW")) {
    return NextResponse.json({ error: "Edit permission required to accept a scenario" }, { status: 403 });
  }
  const { id } = await params;
  const visible = await requireVisibleEstimate(session!.user, id);
  if (visible.error) return visible.error;
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  try {
    const data = await acceptEstimateScenario(id, parsed.data, session!.user.id);
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
