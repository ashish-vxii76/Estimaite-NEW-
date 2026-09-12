import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { can } from "@/lib/access";
import { fromSession } from "@/lib/scope";
import { isGitlabIntakeEnabled } from "@/lib/features";
import { pullableSources, getConnectionStatus } from "@/services/gitlab/intake";
import { getActiveConfig } from "@/services/configService";
import { ImportWizard } from "@/components/intake/ImportWizard";

export default async function NewImportPage() {
  if (!isGitlabIntakeEnabled()) notFound();
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!can(session.user.role, "estimates.import", "RW")) redirect("/home");

  const scopeUser = fromSession(session.user);
  const [sources, connection, config] = await Promise.all([
    pullableSources(scopeUser),
    getConnectionStatus(session.user.id),
    getActiveConfig(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <p className="kicker">Intake</p>
        <h1 className="font-display text-2xl font-semibold text-[var(--navy)]">New GitLab import</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Pull Issues/Epics, pick which to estimate, and the agent drafts them for review.
        </p>
      </div>

      {!connection.connected ? (
        <div className="card p-5">
          <p className="text-sm text-[var(--navy)]">
            You haven't connected GitLab yet. Add your read-only token in{" "}
            <Link href="/admin/integrations/gitlab" className="underline">Integrations → GitLab connection</Link>{" "}
            first.
          </p>
        </div>
      ) : sources.length === 0 ? (
        <div className="card p-5">
          <p className="text-sm text-[var(--navy)]">
            No GitLab sources are mapped to your scope yet. Ask an admin to map one in{" "}
            <Link href="/admin/integrations/gitlab/mapping" className="underline">Source mapping</Link>.
          </p>
        </div>
      ) : (
        <ImportWizard
          sources={sources.map((s) => ({ id: s.id, label: `${s.projectOrGroupRef} · ${s.crewName}` }))}
          releaseQuarters={config.releaseQuarters ?? []}
        />
      )}
    </div>
  );
}
