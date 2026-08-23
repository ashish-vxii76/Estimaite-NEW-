import { NextResponse } from "next/server";
import { z } from "zod";
import { requireFeature, requireUser } from "@/lib/api-auth";
import { getActiveConfig } from "@/services/configService";
import {
  runWhatIf,
  runWhatIfScenario,
  listWhatIfMixes,
  type EstimateCalculationInput,
} from "@/domain/estimation";

const teamSchema = z.object({
  teamId: z.string(),
  teamName: z.string(),
  availableLevels: z.array(z.string()),
  maxDev: z.number().int().min(1),
  maxQa: z.number().int().min(1),
  resourceSprintRate: z.number().optional(),
  teamSprintRate: z.number().optional(),
  currency: z.string().optional(),
  mappedLocation: z.string().optional(),
  locationBlendLabel: z.string().optional(),
  locationAllocations: z
    .array(
      z.object({
        locationId: z.string(),
        locationName: z.string(),
        allocationPct: z.number(),
        dailyRate: z.number(),
        currency: z.string(),
      }),
    )
    .optional(),
  roster: z
    .array(
      z.object({
        name: z.string(),
        roleStream: z.string(),
        location: z.string(),
        seniority: z.string(),
        headcount: z.number().optional(),
      }),
    )
    .optional(),
});

const schema = z.object({
  base: z.any(),
  /** Multi-team CR scenario (preferred). */
  teams: z.array(teamSchema).optional(),
  selectedTeamId: z.string().optional(),
  /** Legacy single-team payload. */
  team: teamSchema.optional(),
  objective: z.enum([
    "LOWEST_COST",
    "FEWEST_SPRINTS",
    "FASTEST_DELIVERY",
    "LEAST_EFFORT",
    "BEST_VALUE",
    "CHEAPEST_WITHIN_N_SPRINTS",
  ]),
  maxSprints: z.number().optional(),
  /** When set with multi-team scenario, also return all mixes for this team. */
  expandTeamId: z.string().optional(),
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

  const teams =
    parsed.data.teams && parsed.data.teams.length > 0
      ? parsed.data.teams
      : parsed.data.team
        ? [parsed.data.team]
        : [];
  if (teams.length === 0) {
    return NextResponse.json({ error: "At least one team is required" }, { status: 400 });
  }

  if (session!.user.teamId) {
    const allowed = new Set(teams.map((t) => t.teamId));
    if (![...allowed].every((id) => id === session!.user.teamId)) {
      return NextResponse.json(
        { error: "You can only run What-If for your team" },
        { status: 403 },
      );
    }
  }

  const config = await getActiveConfig();
  const base = parsed.data.base as EstimateCalculationInput;
  try {
    if (teams.length === 1 && !parsed.data.teams) {
      const result = runWhatIf({
        base,
        config,
        team: teams[0]!,
        objective: parsed.data.objective,
        maxSprints: parsed.data.maxSprints,
      });
      return NextResponse.json({ result });
    }

    const selectedTeamId = parsed.data.selectedTeamId || teams[0]!.teamId;
    const scenario = runWhatIfScenario({
      base,
      config,
      teams,
      selectedTeamId,
      objective: parsed.data.objective,
      maxSprints: parsed.data.maxSprints,
    });
    let allMixes: ReturnType<typeof listWhatIfMixes> | undefined;
    if (parsed.data.expandTeamId) {
      const expandTeam = teams.find((t) => t.teamId === parsed.data.expandTeamId);
      if (expandTeam) {
        allMixes = listWhatIfMixes({
          base,
          config,
          team: expandTeam,
          objective: parsed.data.objective,
          maxSprints: parsed.data.maxSprints,
        });
      }
    }
    return NextResponse.json({
      result: scenario.selected,
      scenario,
      allMixes,
      expandTeamId: parsed.data.expandTeamId ?? null,
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
