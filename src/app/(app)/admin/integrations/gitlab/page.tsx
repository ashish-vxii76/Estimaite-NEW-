import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { can } from "@/lib/access";
import { isGitlabIntakeEnabled } from "@/lib/features";
import { getConnectionStatus } from "@/services/gitlab/intake";
import { GitLabConnectionForm } from "@/components/admin/GitLabConnectionForm";

export default async function GitLabConnectionPage() {
  if (!isGitlabIntakeEnabled()) notFound();
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!can(session.user.role, "integration.gitlab")) redirect("/home");

  const status = await getConnectionStatus(session.user.id);

  return (
    <div className="space-y-6">
      <div>
        <p className="kicker">Administration · Integrations</p>
        <h1 className="font-display text-2xl font-semibold text-[var(--navy)]">GitLab connection</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Your <strong>personal</strong> access token, used only for your own pulls. It must be read-only
          (<code>read_api</code>), is encrypted at rest, and is never shown again or sent to your browser.
        </p>
      </div>
      <GitLabConnectionForm
        connected={status.connected}
        host={status.host ?? "gitlab.com"}
        scopes={status.scopes ?? ""}
        lastUsedAt={status.lastUsedAt ? status.lastUsedAt.toISOString() : null}
      />
    </div>
  );
}
