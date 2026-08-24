import type { LocationAllocation, RosterMember } from "@/domain/estimation/types";

export type ScenarioTeam = {
  teamId: string;
  teamName: string;
  crewId?: string | null;
  crewName?: string | null;
  availableLevels: string[];
  maxDev: number;
  maxQa: number;
  resourceSprintRate: number;
  teamSprintRate: number;
  currency: string;
  mappedLocation: string;
  locationBlendLabel: string;
  locationAllocations: LocationAllocation[];
  roster: RosterMember[];
};

type TeamSource = {
  id: string;
  name: string;
  mappedLocation: string;
  currency: string;
  teamSprintRate: number;
  resourceSprintRate: number;
  locationMixJson?: string | null;
  crewId?: string | null;
  crew?: { id: string; name: string } | null;
  members: { name: string; resourceLevel: string; roleStream: string; location?: string | null }[];
};

type LocationSource = {
  id: string;
  name: string;
  dailyRate: number;
  currency: string;
};

export function toScenarioTeams(
  teams: TeamSource[],
  locations: LocationSource[] = [],
): ScenarioTeam[] {
  const byName = Object.fromEntries(locations.map((l) => [l.name, l]));

  return teams.map((t) => {
    const roster: RosterMember[] = t.members.map((m) => ({
      name: m.name,
      roleStream: m.roleStream,
      location: m.location || t.mappedLocation,
      seniority: m.resourceLevel,
      headcount: 1,
    }));

    let locationAllocations: LocationAllocation[] = [];
    try {
      const mix = JSON.parse(t.locationMixJson || "[]") as {
        location?: string;
        locationName?: string;
        allocationPct?: number;
      }[];
      if (Array.isArray(mix) && mix.length > 0) {
        locationAllocations = mix
          .filter((row) => (row.allocationPct ?? 0) > 0)
          .map((row) => {
            const name = row.locationName || row.location || t.mappedLocation;
            const loc = byName[name];
            return {
              locationId: loc?.id ?? name,
              locationName: name,
              allocationPct: row.allocationPct ?? 0,
              dailyRate: loc?.dailyRate ?? 0,
              currency: loc?.currency ?? t.currency,
            };
          });
      }
    } catch {
      locationAllocations = [];
    }

    if (locationAllocations.length === 0) {
      const loc = byName[t.mappedLocation];
      locationAllocations = [
        {
          locationId: loc?.id ?? t.mappedLocation,
          locationName: t.mappedLocation,
          allocationPct: 100,
          dailyRate: loc?.dailyRate ?? 0,
          currency: loc?.currency ?? t.currency,
        },
      ];
    }

    const blendRate =
      locationAllocations.reduce((s, a) => s + (a.allocationPct / 100) * a.dailyRate, 0) ||
      byName[t.mappedLocation]?.dailyRate ||
      0;

    return {
      teamId: t.id,
      teamName: t.name,
      crewId: t.crewId ?? t.crew?.id ?? null,
      crewName: t.crew?.name ?? null,
      availableLevels: [...new Set(t.members.map((m) => m.resourceLevel))],
      maxDev: Math.max(1, t.members.filter((m) => m.roleStream === "DEV").length),
      maxQa: Math.max(1, t.members.filter((m) => m.roleStream === "QA").length),
      resourceSprintRate: t.resourceSprintRate,
      teamSprintRate: t.teamSprintRate,
      currency: t.currency,
      mappedLocation: t.mappedLocation,
      locationBlendLabel: `${Math.round(blendRate * 100) / 100} ${t.currency}/day`,
      locationAllocations,
      roster,
    };
  });
}
