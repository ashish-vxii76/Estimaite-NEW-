"use client";

import { useMemo, useState, useTransition } from "react";
import {
  saveMapping,
  toggleMapping,
  deleteMapping,
  type ActionResult,
} from "@/actions/gitlabIntegration";
import type { CrewOption, PodOption, MappingRow } from "@/services/gitlab/intake";

export function SourceMappingEditor({
  crews,
  pods,
  mappings,
}: {
  crews: CrewOption[];
  pods: PodOption[];
  mappings: MappingRow[];
}) {
  const [ref, setRef] = useState("");
  const [crewId, setCrewId] = useState(crews[0]?.id ?? "");
  const [podId, setPodId] = useState("");
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, start] = useTransition();

  const podsForCrew = useMemo(() => pods.filter((p) => p.crewId === crewId), [pods, crewId]);

  function run(fn: () => Promise<ActionResult>) {
    setResult(null);
    start(async () => setResult(await fn()));
  }

  return (
    <div className="space-y-6">
      <section className="card max-w-2xl p-5">
        <h3 className="mb-3 font-display text-base font-semibold text-[var(--navy)]">Add / update mapping</h3>
        {crews.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No crews in your scope to map.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                  GitLab project / group ref
                </label>
                <input
                  value={ref}
                  onChange={(e) => setRef(e.target.value)}
                  placeholder="aajoshi.vxii-group/RefineIQ"
                  className="w-full rounded-lg border border-[var(--line)] bg-[var(--panel)] px-3 py-2 text-sm font-mono"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Crew</label>
                  <select
                    value={crewId}
                    onChange={(e) => { setCrewId(e.target.value); setPodId(""); }}
                    className="w-full rounded-lg border border-[var(--line)] bg-[var(--panel)] px-3 py-2 text-sm"
                  >
                    {crews.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Default pod (optional)</label>
                  <select
                    value={podId}
                    onChange={(e) => setPodId(e.target.value)}
                    className="w-full rounded-lg border border-[var(--line)] bg-[var(--panel)] px-3 py-2 text-sm"
                  >
                    <option value="">— none —</option>
                    {podsForCrew.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="flex items-end">
              <button
                className="btn-gold text-sm"
                disabled={pending || !ref.trim() || !crewId}
                onClick={() => run(() => saveMapping({ projectOrGroupRef: ref, crewId, defaultPodTeamId: podId || null }))}
              >
                {pending ? "Saving…" : "Save mapping"}
              </button>
            </div>
          </div>
        )}
        {result ? (
          <p className={`mt-3 text-sm ${result.ok ? "text-[var(--ok)]" : "text-[var(--danger)]"}`}>{result.message}</p>
        ) : null}
      </section>

      <section className="card p-5">
        <h3 className="mb-3 font-display text-base font-semibold text-[var(--navy)]">Existing mappings</h3>
        {mappings.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No mappings yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm [&_td]:px-3 [&_td]:py-2 [&_th]:px-3 [&_th]:py-2">
              <thead className="text-left text-xs uppercase tracking-wide text-[var(--muted)]">
                <tr>
                  <th>Source</th><th>Crew</th><th>Default pod</th><th>Status</th><th></th>
                </tr>
              </thead>
              <tbody>
                {mappings.map((m) => (
                  <tr key={m.id} className="border-t border-[var(--line)]">
                    <td className="font-mono text-[var(--navy)]">{m.projectOrGroupRef}</td>
                    <td>{m.crewName}</td>
                    <td className="text-[var(--muted)]">{m.defaultPodName ?? "—"}</td>
                    <td>
                      <span className={m.enabled ? "chip-ok rounded-full px-2 py-0.5 text-[11px] font-semibold" : "chip-neutral rounded-full px-2 py-0.5 text-[11px] font-semibold"}>
                        {m.enabled ? "Enabled" : "Disabled"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap text-right">
                      <button className="mr-3 text-xs font-medium text-[var(--navy)] underline" disabled={pending}
                        onClick={() => run(() => toggleMapping(m.id, !m.enabled))}>
                        {m.enabled ? "Disable" : "Enable"}
                      </button>
                      <button className="text-xs font-medium text-[var(--danger)] underline" disabled={pending}
                        onClick={() => run(() => deleteMapping(m.id))}>
                        Delete
                      </button>
                    </td>
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
