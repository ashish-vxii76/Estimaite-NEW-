import { prisma } from "@/lib/prisma";
import { getActiveConfig } from "@/services/configService";
import { TeamCompositionEditor } from "@/components/admin/TeamCompositionEditor";

export default async function TeamCompositionPage() {
  const [teams, members, config] = await Promise.all([
    prisma.team.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.teamMember.findMany({ include: { team: true }, orderBy: { name: "asc" } }),
    getActiveConfig(),
  ]);
  return (
    <TeamCompositionEditor
      teams={teams.map((t) => ({ id: t.id, name: t.name }))}
      locations={config.costMappings.map((c) => c.location)}
      levels={config.resourceLevels.map((l) => l.id)}
      members={members.map((m) => ({
        id: m.id,
        teamId: m.teamId,
        teamName: m.team.name,
        name: m.name,
        resourceLevel: m.resourceLevel,
        roleStream: m.roleStream,
        location: m.location,
      }))}
    />
  );
}
