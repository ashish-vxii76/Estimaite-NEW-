import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { auth } from "@/auth";
import { StatusBadge } from "@/components/ui";
import { EstimateFilters } from "@/components/EstimateFilters";
import { formatMoney } from "@/lib/utils";
import type { EstimateCalculationResult } from "@/domain/estimation/types";
import { can } from "@/lib/access";
import { fromSession, resolveEstimateScope, teamsForUser } from "@/lib/scope";
import { getActiveConfig } from "@/services/configService";
import { releaseWhere } from "@/lib/releasePeriod";

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
    crew?: string;
  }>;
}) {
  const session = await auth();
  const {
    status = "",
    release = "",
    team = "",
    workItemType = "",
    tshirt = "",
    flag = "",
    crew = "",
  } = await searchParams;
  const scope = await resolveEstimateScope(fromSession(session!.user));
  const where = {
    ...scope,
    ...(status === "DRAFT"
      ? { status: { in: ["DRAFT", "RETURNED"] as string[] } }
      : status
        ? { status }
        : {}),
    ...releaseWhere(release),
    ...(team ? { teamId: team } : {}),
    ...(crew && !team ? { team: { crewId: crew } } : {}),
    ...(workItemType ? { workItemType } : {}),
  };
  const [estimates, config, teams, orgUnits] = await Promise.all([
    prisma.estimate.findMany({
      where,
      include: { team: { include: { crew: true } } },
      orderBy: { updatedAt: "desc" },
    }),
    getActiveConfig(),
    teamsForUser(fromSession(session!.user)),
    prisma.orgUnit.findMany({
      where: { active: true, type: "CREW" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);
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

  const filteredTeams = crew ? teams.filter((t) => t.crewId === crew) : teams;

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
        crew={crew}
        team={team}
        crews={orgUnits}
        teams={filteredTeams.map((t) => ({ id: t.id, name: t.name }))}
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
