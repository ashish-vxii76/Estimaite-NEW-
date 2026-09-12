import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { can } from "@/lib/access";
import { isGitlabIntakeEnabled } from "@/lib/features";

export default async function IntegrationsPage() {
  if (!isGitlabIntakeEnabled()) notFound();
  const session = await auth();
  if (!can(session?.user.role, "integration.gitlab")) redirect("/home");

  return (
    <div className="space-y-6">
      <div>
        <p className="kicker">Administration</p>
        <h1 className="font-display text-2xl font-semibold text-[var(--navy)]">Integrations</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">Connect external sources and map them to crews.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/admin/integrations/gitlab" className="card card-interactive p-5">
          <h3 className="font-display text-base font-semibold text-[var(--navy)]">GitLab connection</h3>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Your personal read-only access token (per-user, encrypted). Add, test, or revoke.
          </p>
        </Link>
        <Link href="/admin/integrations/gitlab/mapping" className="card card-interactive p-5">
          <h3 className="font-display text-base font-semibold text-[var(--navy)]">Source mapping</h3>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Map a GitLab project or group to a crew (and an optional default pod).
          </p>
        </Link>
      </div>
    </div>
  );
}
