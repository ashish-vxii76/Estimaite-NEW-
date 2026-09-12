import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { can } from "@/lib/access";
import { fromSession } from "@/lib/scope";
import { isGitlabIntakeEnabled } from "@/lib/features";
import { getRunDetail } from "@/services/gitlab/intake";
import { ProcessRunButton } from "@/components/intake/ProcessRunButton";

const ITEM_CHIP: Record<string, string> = {
  PENDING: "chip-neutral",
  DRAFTED: "chip-ok",
  DUPLICATE: "chip-warn",
  SKIPPED: "chip-neutral",
  ERROR: "chip-bad",
};

const RUNNABLE = new Set(["QUEUED", "IN_PROGRESS", "PARTIAL", "FAILED"]);

export default async function RunDetailPage({ params }: { params: Promise<{ id: string }> }) {
  if (!isGitlabIntakeEnabled()) notFound();
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!can(session.user.role, "estimates.import")) redirect("/home");

  const { id } = await params;
  const run = await getRunDetail(fromSession(session.user), id);
  if (!run) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="kicker">Intake · Import run</p>
          <h1 className="font-display text-2xl font-semibold text-[var(--navy)]">{run.source}</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {run.crewName} · {run.status.replace("_", " ")} · {run.processed}/{run.total} processed
            {run.defaultReleaseQuarter ? ` · release ${run.defaultReleaseQuarter}` : ""}
          </p>
        </div>
        {RUNNABLE.has(run.status) ? <ProcessRunButton runId={run.id} /> : null}
      </div>

      <section className="card p-5">
        <div className="overflow-x-auto">
          <table className="w-full text-sm [&_td]:px-3 [&_td]:py-2.5 [&_th]:px-3 [&_th]:py-2">
            <thead className="text-left text-xs uppercase tracking-wide text-[var(--muted)]">
              <tr><th>Type</th><th>#</th><th>Status</th><th>Draft</th><th>Note</th></tr>
            </thead>
            <tbody>
              {run.items.map((i) => (
                <tr key={i.id} className="border-t border-[var(--line)]">
                  <td className="text-[var(--muted)]">{i.gitlabType}</td>
                  <td className="tabular-nums text-[var(--muted)]">{i.gitlabIid}</td>
                  <td>
                    <span className={`${ITEM_CHIP[i.status] ?? "chip-neutral"} rounded-full px-2 py-0.5 text-[11px] font-semibold`}>
                      {i.status}
                    </span>
                  </td>
                  <td>
                    {i.estimateId ? (
                      <Link href={`/estimates/${i.estimateId}`} className="font-semibold text-[var(--navy)] underline">
                        {i.estimateRef ?? "open"}
                      </Link>
                    ) : (
                      <span className="text-[var(--muted)]">—</span>
                    )}
                  </td>
                  <td className="max-w-[18rem] truncate text-xs text-[var(--danger)]" title={i.error ?? ""}>{i.error ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
