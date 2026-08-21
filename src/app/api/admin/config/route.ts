import { NextResponse } from "next/server";
import { requireFeature, requireUser } from "@/lib/api-auth";
import { getActiveConfig, patchActiveConfig } from "@/services/configService";
import { can } from "@/lib/access";
import type { EstimationConfig } from "@/domain/estimation/types";

export async function GET() {
  const { session, error } = await requireUser();
  if (error) return error;
  if (
    !can(session!.user.role, "config.mappings") &&
    !can(session!.user.role, "config.rates") &&
    !can(session!.user.role, "config.teams")
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const config = await getActiveConfig();
  return NextResponse.json({ config });
}

export async function PUT(request: Request) {
  const { session, error } = await requireUser();
  if (error) return error;
  const body = await request.json();
  const section = String(body.section ?? "");
  const rateSection = ["costMappings", "locationDailyRates", "teamCostMappings"].includes(section);
  const forbidden = requireFeature(
    session!.user.role,
    rateSection ? "config.rates" : "config.mappings",
    "RW",
  );
  if (forbidden) return forbidden;
  const patch: Partial<EstimationConfig> = {};
  if (section === "issueMappings") patch.issueMappings = body.rows;
  else if (section === "epicMappings") patch.epicMappings = body.rows;
  else if (section === "resourceLevels") patch.resourceLevels = body.rows;
  else if (section === "complexityMappings") patch.complexityMappings = body.rows;
  else if (section === "complexityDimensions") patch.complexityDimensions = body.rows;
  else if (section === "releaseQuarters") patch.releaseQuarters = body.releaseQuarters ?? body.rows;
  else if (section === "readinessCriteria") {
    patch.readinessCriteria = body.rows;
    if (body.readinessAssumptionsMin != null) {
      patch.readinessAssumptionsMin = Number(body.readinessAssumptionsMin);
    }
  }
  else if (section === "costMappings") patch.costMappings = body.rows;
  else if (section === "locationDailyRates") patch.locationDailyRates = body.rows;
  else if (section === "teamCostMappings") patch.teamCostMappings = body.rows;
  else if (section === "allowedIssueStoryPoints") patch.allowedIssueStoryPoints = body.rows;
  else if (section === "estimationConfig") Object.assign(patch, body.estimationConfig ?? {});
  else return NextResponse.json({ error: `Unknown section ${section}` }, { status: 400 });

  const config = await patchActiveConfig(patch, session!.user.id);
  return NextResponse.json({ config });
}
