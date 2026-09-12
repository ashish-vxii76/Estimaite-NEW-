import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { can } from "@/lib/access";
import { fromSession } from "@/lib/scope";
import { isGitlabIntakeEnabled } from "@/lib/features";
import { listRuns } from "@/services/gitlab/intake";

const STATUS_CHIP: Record<string, string> = {
  QUEUED: "chip-neutral",
  IN_PROGRESS: "chip-warn",
  COMPLETED: "chip-ok",
  PARTIAL: "chip-warn",
  FAILED: "chip-bad",
};

export default async function ImportRunsPage() {
  if (!isGitlabIntakeEnabled()) notFound();
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!can(session.user.role, "estimates.import")) redirect("/home");

  const runs = await listRuns(fromSession(session.user));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="kicker">Intake</p>
          <h1 className="font-display text-2xl font-semibold text-[var(--navy)]">Import runs</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">GitLab pulls and their per-item outcomes.</p>
        </div>
        <Link href="/intake/new" className="btn-gold text-sm">+ New import</Link>
      </div>

      <section className="card p-5">
        {runs.length === 0 ? (
          <p className="py-8 text-center text-sm text-[var(--muted)]">
            No imports yet. <Link href="/intake/new" className="underline">Start one →</Link>
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm [&_td]:px-3 [&_td]:py-2.5 [&_th]:px-3 [&_th]:py-2">
              <thead className="text-left text-xs uppercase tracking-wide text-[var(--muted)]">
                <tr><th>Source</th><th>Crew</th><th>Status</th><th>Progress</th><th>By</th><th>When</th></tr>
              </thead>
              <tbody>
                {runs.map((r) => (
                  <tr key={r.id} className="border-t border-[var(--line)]">
                    <td className="font-mono text-[var(--navy)]">{r.source}</td>
                    <td>{r.crewName}</td>
                    <td>
                      <span className={`${STATUS_CHIP[r.status] ?? "chip-neutral"} rounded-full px-2 py-0.5 text-[11px] font-semibold`}>
                        {r.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="tabular-nums text-[var(--muted)]">{r.processed}/{r.total}</td>
                    <td className="text-[var(--muted)]">{r.triggeredBy}</td>
                    <td className="text-[var(--muted)]">{new Date(r.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
