import { NextResponse } from "next/server";
import { z } from "zod";
import { requireFeature, requireUser } from "@/lib/api-auth";
import { getActiveConfig } from "@/services/configService";
import { runWhatIf, type EstimateCalculationInput } from "@/domain/estimation";

const schema = z.object({
  base: z.any(),
  team: z.object({
    teamId: z.string(),
    teamName: z.string(),
    availableLevels: z.array(z.string()),
    maxDev: z.number().int().min(1),
    maxQa: z.number().int().min(1),
  }),
  objective: z.enum([
    "LOWEST_COST",
    "FEWEST_SPRINTS",
    "FASTEST_DELIVERY",
    "LEAST_EFFORT",
    "BEST_VALUE",
    "CHEAPEST_WITHIN_N_SPRINTS",
  ]),
  maxSprints: z.number().optional(),
});

export async function POST(request: Request) {
  const { session, error } = await requireUser();
  if (error) return error;
  const forbidden = requireFeature(session!.user.role, "whatIf", "RW");
  if (forbidden) return forbidden;
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  if (session!.user.teamId && parsed.data.team.teamId !== session!.user.teamId) {
    return NextResponse.json({ error: "You can only run What-If for your team" }, { status: 403 });
  }
  const config = await getActiveConfig();
  try {
    const result = runWhatIf({
      base: parsed.data.base as EstimateCalculationInput,
      config,
      team: parsed.data.team,
      objective: parsed.data.objective,
      maxSprints: parsed.data.maxSprints,
    });
    return NextResponse.json({ result });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
