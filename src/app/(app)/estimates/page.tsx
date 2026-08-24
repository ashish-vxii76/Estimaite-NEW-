import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { auth } from "@/auth";
import { StatusBadge } from "@/components/ui";
import { EstimateFilters } from "@/components/EstimateFilters";
import { formatMoney } from "@/lib/utils";
import type { EstimateCalculationResult } from "@/domain/estimation/types";
import { can, seesAllTeams } from "@/lib/access";
import { fromSession, resolveEstimateScope, teamsForUser } from "@/lib/scope";
import { getActiveConfig } from "@/services/configService";
import { releaseWhere } from "@/lib/releasePeriod";
import { lockedOrgPathForUser } from "@/lib/lockedOrgPath";
import {
  estimateWhereForOrgCascade,
  lockIdsFromPath,
  teamsMatchingCascade,
} from "@/lib/orgCascade";

export default async function EstimatesPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    release?: string;
    team?: string;
    workItemType?: string;
    tshirt?: string;
    flag?: string;
    company?: string;
    division?: string;
    subDivision?: string;
    stream?: string;
    crew?: string;
  }>;
}) {
  const session = await auth();
  const {
    status = "",
    release = "",
    team: teamParam = "",
    workItemType = "",
    tshirt = "",
    flag = "",
    company: companyParam = "",
    division: divisionParam = "",
    subDivision: subParam = "",
    stream: streamParam = "",
    crew: crewParam = "",
  } = await searchParams;

  const orgEditable = seesAllTeams(session!.user.role);
  const lockedPath = await lockedOrgPathForUser(session!.user.id);
  const scope = await resolveEstimateScope(fromSession(session!.user));

  const [config, teams, orgUnits] = await Promise.all([
    getActiveConfig(),
    teamsForUser(fromSession(session!.user)),
    prisma.orgUnit.findMany({
      where: { active: true },
      select: { id: true, name: true, type: true, parentId: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const lockIds = lockIdsFromPath(orgUnits, lockedPath);
  const company = orgEditable ? companyParam : lockIds.companyId;
  const division = orgEditable ? divisionParam : lockIds.divisionId;
  const subDivision = orgEditable ? subParam : lockIds.subDivisionId;
  const stream = orgEditable ? streamParam : lockIds.streamId;
  const crew = orgEditable ? crewParam : lockIds.crewId || crewParam;
  const teamFilter = teamParam;

  const cascade = { company, division, subDivision, stream, crew, team: teamFilter };
  const orgWhere = estimateWhereForOrgCascade(orgUnits, cascade);
  const where = {
    ...scope,
    ...orgWhere,
    ...(status === "DRAFT"
      ? { status: { in: ["DRAFT", "RETURNED"] as string[] } }
      : status
        ? { status }
        : {}),
    ...releaseWhere(release),
    ...(workItemType ? { workItemType } : {}),
  };

  const estimates = await prisma.estimate.findMany({
    where,
    include: { team: { include: { crew: true } } },
    orderBy: { updatedAt: "desc" },
  });
  const canCreate = can(session?.user.role, "estimates.create", "RW");
  const quarters = config.releaseQuarters ?? [];

  const rows = estimates
    .map((row) => {
      const result = parseResult(row.resultJson);
      return { row, result };
    })
    .filter(({ result }) => {
      if (tshirt && (result?.effectiveTshirt ?? "") !== tshirt) return false;
      if (flag) {
        const delivery = result?.deliveryFlag ?? result?.governanceDecision ?? "";
        if (delivery !== flag) return false;
      }
      return true;
    });

  const podOptions = teamsMatchingCascade(orgUnits, teams, {
    company,
    division,
    subDivision,
    stream,
    crew,
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="kicker">Register</p>
          <h1 className="font-display text-2xl font-semibold text-[var(--navy)]">Estimates</h1>
        </div>
        {canCreate ? (
          <Link href="/estimates/new" className="btn-primary">
            New estimate
          </Link>
        ) : null}
      </div>

      <EstimateFilters
        quarters={quarters}
        status={status}
        workItemType={workItemType}
        release={release}
        tshirt={tshirt}
        flag={flag}
        orgUnits={orgUnits}
        teams={podOptions.map((t) => ({ id: t.id, name: t.name, crewId: t.crewId }))}
        orgEditable={orgEditable}
        lockedPath={lockedPath}
        company={company}
        division={division}
        subDivision={subDivision}
        stream={stream}
        crew={crew}
        team={teamFilter}
      />

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead className="bg-[var(--panel-2)] text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3">Reference</th>
              <th>Type</th>
              <th>Title</th>
              <th>Crew</th>
              <th>Pod</th>
              <th>Release</th>
              <th>T-shirt</th>
              <th>SP</th>
              <th>Flag</th>
              <th>AI-adj cost</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-[var(--muted)]" colSpan={11}>
                  No estimates in this filter for this profile.
                </td>
              </tr>
            ) : (
              rows.map(({ row, result }) => {
                const deferred = result?.costApplicability && result.costApplicability !== "OK";
                return (
                  <tr key={row.id} className="border-t border-[var(--line)]">
                    <td className="px-4 py-3">
                      <Link
                        className="font-medium text-[var(--navy)] underline"
                        href={`/estimates/${row.id}`}
                      >
                        {row.reference}
                      </Link>
                    </td>
                    <td>{row.workItemType === "EPIC" ? "Epic" : "Issue"}</td>
                    <td>{row.title}</td>
                    <td>{row.team.crew?.name ?? "—"}</td>
                    <td>{row.team.name}</td>
                    <td>{row.release || "—"}</td>
                    <td className="font-semibold text-[var(--navy)]">
                      {result?.effectiveTshirt ?? "—"}
                    </td>
                    <td>{result?.selectedSp ?? "—"}</td>
                    <td>
                      {result ? (
                        <StatusBadge status={result.deliveryFlag ?? result.governanceDecision} />
                      ) : (
                        <span className="text-[var(--muted)]">Not calculated</span>
                      )}
                    </td>
                    <td>
                      {deferred
                        ? "Deferred"
                        : formatMoney(
                            result?.aiAdjustedDeliveryCost ?? null,
                            result?.currency ?? row.currency,
                          )}
                    </td>
                    <td>
                      <StatusBadge status={row.status} />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function parseResult(json: string | null): EstimateCalculationResult | null {
  if (!json) return null;
  try {
    return JSON.parse(json) as EstimateCalculationResult;
  } catch {
    return null;
  }
}
