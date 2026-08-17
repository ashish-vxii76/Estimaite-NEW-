import { NextResponse } from "next/server";
import { requireRole, requireUser } from "@/lib/api-auth";
import { getActiveConfig, patchActiveConfig } from "@/services/configService";
import type { EstimationConfig } from "@/domain/estimation/types";

export async function GET() {
  const { error } = await requireUser();
  if (error) return error;
  const config = await getActiveConfig();
  return NextResponse.json({ config });
}

export async function PUT(request: Request) {
  const { session, error } = await requireUser();
  if (error) return error;
  const forbidden = requireRole(session!.user.role, ["ADMINISTRATOR", "FINANCE"]);
  if (forbidden) return forbidden;
  const body = await request.json();
  const section = String(body.section ?? "");
  const patch: Partial<EstimationConfig> = {};
  if (section === "issueMappings") patch.issueMappings = body.rows;
  else if (section === "epicMappings") patch.epicMappings = body.rows;
  else if (section === "resourceLevels") patch.resourceLevels = body.rows;
  else if (section === "complexityMappings") patch.complexityMappings = body.rows;
  else if (section === "costMappings") patch.costMappings = body.rows;
  else if (section === "locationDailyRates") patch.locationDailyRates = body.rows;
  else if (section === "allowedIssueStoryPoints") patch.allowedIssueStoryPoints = body.rows;
  else if (section === "estimationConfig") Object.assign(patch, body.estimationConfig ?? {});
  else return NextResponse.json({ error: `Unknown section ${section}` }, { status: 400 });

  const config = await patchActiveConfig(patch, session!.user.id);
  return NextResponse.json({ config });
}
