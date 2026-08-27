import { NextResponse } from "next/server";
import { requireFeature, requireUser } from "@/lib/api-auth";
import { fromSession } from "@/lib/scope";
import { getOrgFilterData } from "@/lib/orgFilter";
import { descendantIds, resolveOrgCurrency } from "@/services/orgService";
import { getPortfolio } from "@/services/portfolioService";

function csvCell(v: unknown): string {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** CSV of the Roll-up & CR register, respecting the current year + org/team filters and scope. */
export async function GET(request: Request) {
  const { session, error } = await requireUser();
  if (error) return error;
  const forbidden = requireFeature(session!.user.role, "portfolio.view", "R");
  if (forbidden) return forbidden;

  const url = new URL(request.url);
  const year = Number(url.searchParams.get("year")) || new Date().getFullYear();
  const org = url.searchParams.get("org") || "";
  const team = url.searchParams.get("team") || "";

  const scopeUser = fromSession(session!.user);
  const orgFilter = await getOrgFilterData(scopeUser);
  let selectionCrewIds: string[] | null = null;
  if (team) {
    const t = orgFilter.teams.find((x) => x.id === team);
    selectionCrewIds = t?.crewId ? [t.crewId] : [];
  } else if (org) {
    const sub = new Set(await descendantIds(org));
    selectionCrewIds = orgFilter.units.filter((u) => u.type === "CREW" && sub.has(u.id)).map((u) => u.id);
  }
  const currency = await resolveOrgCurrency({ orgUnitId: org || null, crewIds: selectionCrewIds });
  const data = await getPortfolio({
    user: scopeUser,
    year,
    crewIds: selectionCrewIds,
    teamId: team || null,
    currency,
  });

  const header = [
    "Reference", "Type", "Title", "Crew", "Pod", "Programme", "Project", "Release",
    "T-shirt", "Delivery Flag", "Status", "SP", `Baseline (${currency})`, `AI-adjusted (${currency})`,
  ];
  const lines = [header.map(csvCell).join(",")];
  for (const r of data.register) {
    lines.push(
      [
        r.reference,
        r.workItemType === "EPIC" ? "Epic" : "Issue",
        r.title,
        r.crew,
        r.team,
        r.programme,
        r.project,
        r.release,
        r.effectiveTshirt,
        r.deliveryFlag ?? r.governanceDecision,
        r.status,
        r.selectedSp ?? "",
        r.baselineDeliveryCost ?? "",
        r.aiAdjustedDeliveryCost ?? "",
      ]
        .map(csvCell)
        .join(","),
    );
  }

  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="rollup-${year}.csv"`,
    },
  });
}
