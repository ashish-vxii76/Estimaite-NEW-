export type ScenarioTeam = {
  teamId: string;
  teamName: string;
  availableLevels: string[];
  maxDev: number;
  maxQa: number;
};

export function toScenarioTeams(
  teams: {
    id: string;
    name: string;
    members: { resourceLevel: string; roleStream: string }[];
  }[],
): ScenarioTeam[] {
  return teams.map((t) => ({
    teamId: t.id,
    teamName: t.name,
    availableLevels: [...new Set(t.members.map((m) => m.resourceLevel))],
    maxDev: Math.max(1, t.members.filter((m) => m.roleStream === "DEV").length),
    maxQa: Math.max(1, t.members.filter((m) => m.roleStream === "QA").length),
  }));
}
