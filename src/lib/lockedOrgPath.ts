import { prisma } from "@/lib/prisma";
import type { OrgPath } from "@/lib/orgTypes";
import { getPrimarySeat, resolveOrgPathForTeam } from "@/services/orgService";

/** Display path: levels above the seat are named; levels below the seat are "All". */
export type LockedOrgPathView = {
  companyName: string;
  divisionName: string;
  subDivisionName: string;
  streamName: string;
  crewName: string;
  /** Set when path is pinned to one Crew (seat at Crew, or CR pod’s Crew). */
  crewId: string | null;
  seatOrgUnitId: string | null;
  seatType: string | null;
};

const ALL = "All";

function emptyPath(): LockedOrgPathView {
  return {
    companyName: ALL,
    divisionName: ALL,
    subDivisionName: ALL,
    streamName: ALL,
    crewName: ALL,
    crewId: null,
    seatOrgUnitId: null,
    seatType: null,
  };
}

/** Walk ancestors of an org unit into a full path (missing levels = All). */
async function pathFromUnitId(unitId: string): Promise<{
  companyName: string;
  divisionName: string;
  subDivisionName: string;
  streamName: string;
  crewName: string;
  crewId: string | null;
  unitType: string;
}> {
  const units = await prisma.orgUnit.findMany({
    select: { id: true, type: true, name: true, parentId: true },
  });
  const byId = new Map(units.map((u) => [u.id, u]));
  let cur = byId.get(unitId) ?? null;
  const names: Partial<Record<string, string>> = {};
  let crewId: string | null = null;
  let unitType = cur?.type ?? "";
  while (cur) {
    names[cur.type] = cur.name;
    if (cur.type === "CREW") crewId = cur.id;
    cur = cur.parentId ? byId.get(cur.parentId) ?? null : null;
  }
  return {
    companyName: names.COMPANY ?? ALL,
    divisionName: names.DIVISION ?? ALL,
    subDivisionName: names.SUB_DIVISION ?? ALL,
    streamName: names.STREAM ?? ALL,
    crewName: names.CREW ?? ALL,
    crewId,
    unitType,
  };
}

/**
 * Locked org path from the user’s primary seat.
 * Ancestors of the seat are filled; descendants stay "All".
 */
export async function lockedOrgPathForUser(userId: string): Promise<LockedOrgPathView> {
  const seat = await getPrimarySeat(userId);
  if (!seat) return emptyPath();
  const walked = await pathFromUnitId(seat.orgUnitId);
  const order = ["COMPANY", "DIVISION", "SUB_DIVISION", "STREAM", "CREW"] as const;
  const seatIdx = order.indexOf(walked.unitType as (typeof order)[number]);
  const below = (type: (typeof order)[number]) =>
    seatIdx >= 0 && order.indexOf(type) > seatIdx ? ALL : undefined;

  return {
    companyName: below("COMPANY") ?? walked.companyName,
    divisionName: below("DIVISION") ?? walked.divisionName,
    subDivisionName: below("SUB_DIVISION") ?? walked.subDivisionName,
    streamName: below("STREAM") ?? walked.streamName,
    crewName: below("CREW") ?? walked.crewName,
    crewId: walked.unitType === "CREW" ? walked.crewId : null,
    seatOrgUnitId: seat.orgUnitId,
    seatType: seat.seatType,
  };
}

/** Locked path from a Pod/Team (full cascade). Used on CR Scenarios. */
export async function lockedOrgPathForTeam(teamId: string): Promise<LockedOrgPathView> {
  const path = await resolveOrgPathForTeam(teamId);
  if (!path) return emptyPath();
  return fromOrgPath(path);
}

export function fromOrgPath(path: OrgPath): LockedOrgPathView {
  return {
    companyName: path.companyName,
    divisionName: path.divisionName,
    subDivisionName: path.subDivisionName,
    streamName: path.streamName,
    crewName: path.crewName,
    crewId: path.crewId,
    seatOrgUnitId: path.crewId,
    seatType: null,
  };
}

/** Client-side: derive locked path labels from org units + a crew id. */
export function lockedOrgPathFromUnits(
  units: { id: string; type: string; name: string; parentId: string | null }[],
  crewId: string | null | undefined,
): LockedOrgPathView {
  if (!crewId) return emptyPath();
  const byId = new Map(units.map((u) => [u.id, u]));
  const crew = byId.get(crewId);
  if (!crew || crew.type !== "CREW") return emptyPath();
  const stream = crew.parentId ? byId.get(crew.parentId) : null;
  const sub = stream?.parentId ? byId.get(stream.parentId) : null;
  const division = sub?.parentId ? byId.get(sub.parentId) : null;
  const company = division?.parentId ? byId.get(division.parentId) : null;
  return {
    companyName: company?.name ?? ALL,
    divisionName: division?.name ?? ALL,
    subDivisionName: sub?.name ?? ALL,
    streamName: stream?.name ?? ALL,
    crewName: crew.name,
    crewId: crew.id,
    seatOrgUnitId: crew.id,
    seatType: null,
  };
}
