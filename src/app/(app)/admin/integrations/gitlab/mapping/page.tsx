import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { can } from "@/lib/access";
import { fromSession } from "@/lib/scope";
import { isGitlabIntakeEnabled } from "@/lib/features";
import { configurableCrews, podsForCrews, listMappings } from "@/services/gitlab/intake";
import { SourceMappingEditor } from "@/components/admin/SourceMappingEditor";

export default async function SourceMappingPage() {
  if (!isGitlabIntakeEnabled()) notFound();
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!can(session.user.role, "integration.gitlab")) redirect("/home");

  const scopeUser = fromSession(session.user);
  const crews = await configurableCrews(scopeUser);
  const pods = await podsForCrews(crews.map((c) => c.id));
  const mappings = await listMappings(scopeUser);

  return (
    <div className="space-y-6">
      <div>
        <p className="kicker">Administration · Integrations</p>
        <h1 className="font-display text-2xl font-semibold text-[var(--navy)]">Source mapping</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Map a GitLab project or group to a <strong>crew</strong> (and an optional default pod). Pulls
          are scoped to these mappings. Demo: <code>aajoshi.vxii-group/RefineIQ</code> → IBRL.
        </p>
      </div>
      <SourceMappingEditor crews={crews} pods={pods} mappings={mappings} />
    </div>
  );
}
