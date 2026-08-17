import { getActiveConfig } from "@/services/configService";
import { TeamCompositionEditor } from "@/components/admin/TeamCompositionEditor";
import { auth } from "@/auth";
import { can } from "@/lib/rbac";
import { fromSession, teamsForUser } from "@/lib/scope";

export default async function TeamCompositionPage() {
  const session = await auth();
  const [teams, config] = await Promise.all([
    teamsForUser(fromSession(session!.user)),
    getActiveConfig(),
  ]);
  const members = teams.flatMap((t) =>
    t.members.map((m) => ({
      id: m.id,
      teamId: m.teamId,
      teamName: t.name,
      name: m.name,
      resourceLevel: m.resourceLevel,
      roleStream: m.roleStream,
      location: m.location,
    })),
  );
  return (
    <TeamCompositionEditor
      teams={teams.map((t) => ({ id: t.id, name: t.name }))}
      locations={config.costMappings.map((c) => c.location)}
      levels={config.resourceLevels.map((l) => l.id)}
      members={members}
      readOnly={!can(session?.user.role, "config.teams", "RW")}
    />
  );
}
