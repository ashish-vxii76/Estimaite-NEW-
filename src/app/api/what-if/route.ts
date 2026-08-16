import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/api-auth";
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
  objective: z.enum(["LOWEST_COST", "FASTEST_DELIVERY", "CHEAPEST_WITHIN_N_SPRINTS"]),
  maxSprints: z.number().optional(),
});

export async function POST(request: Request) {
  const { error } = await requireUser();
  if (error) return error;
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
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
