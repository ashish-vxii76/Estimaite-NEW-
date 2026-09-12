"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { previewAction, createRunAction } from "@/actions/gitlabIntake";
import type { PreviewCandidate } from "@/services/gitlab/intake";

type Source = { id: string; label: string };

export function ImportWizard({ sources, releaseQuarters }: { sources: Source[]; releaseQuarters: string[] }) {
  const router = useRouter();
  const [mappingId, setMappingId] = useState(sources[0]?.id ?? "");
  const [type, setType] = useState<"ISSUE" | "EPIC">("ISSUE");
  const [state, setState] = useState("opened");
  const [labels, setLabels] = useState("");
  const [showImported, setShowImported] = useState(false);
  const [quarter, setQuarter] = useState("");
  const [candidates, setCandidates] = useState<PreviewCandidate[] | null>(null);
  const [hidden, setHidden] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function preview() {
    setError(null);
    setCandidates(null);
    setSelected(new Set());
    start(async () => {
      const r = await previewAction(mappingId, { type, state, labels: labels.trim() || undefined, showImported });
      if (r.error) setError(r.error);
      else {
        setCandidates(r.candidates);
        setHidden(r.hiddenImported);
      }
    });
  }

  function toggle(ref: string) {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(ref)) n.delete(ref);
      else n.add(ref);
      return n;
    });
  }

  function confirm() {
    setError(null);
    start(async () => {
      const r = await createRunAction({
        mappingId,
        filters: { type, state, labels: labels.trim() || undefined },
        selectedRefs: [...selected],
        defaultReleaseQuarter: quarter || null,
      });
      if (!r.ok) setError(r.message);
      else router.push("/intake/runs");
    });
  }

  const selectableRefs = (candidates ?? []).filter((c) => !c.alreadyImported).map((c) => c.externalRef);

  const field = "rounded-lg border border-[var(--line)] bg-[var(--panel)] px-3 py-2 text-sm";
  const lbl = "mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]";

  return (
    <div className="space-y-4">
      {/* Source + filters */}
      <section className="card p-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2">
            <label className={lbl}>Source</label>
            <select value={mappingId} onChange={(e) => setMappingId(e.target.value)} className={`${field} w-full`}>
              {sources.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label className={lbl}>Type</label>
            <select value={type} onChange={(e) => setType(e.target.value as "ISSUE" | "EPIC")} className={`${field} w-full`}>
              <option value="ISSUE">Issues</option>
              <option value="EPIC">Epics</option>
            </select>
          </div>
          <div>
            <label className={lbl}>State</label>
            <select value={state} onChange={(e) => setState(e.target.value)} className={`${field} w-full`}>
              <option value="opened">Opened</option>
              <option value="closed">Closed</option>
              <option value="all">All</option>
            </select>
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <label className={lbl}>Labels (comma-separated, optional)</label>
            <input value={labels} onChange={(e) => setLabels(e.target.value)} placeholder="backend,priority::high" className={`${field} w-full`} />
          </div>
          <div className="flex items-end">
            <button className="btn-gold w-full text-sm" onClick={preview} disabled={pending || !mappingId}>
              {pending && candidates === null ? "Loading…" : "Preview"}
            </button>
          </div>
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm text-[var(--muted)]">
          <input type="checkbox" checked={showImported} onChange={(e) => setShowImported(e.target.checked)} />
          Show already-imported items
        </label>
        {error ? <p className="mt-3 text-sm text-[var(--danger)]">{error}</p> : null}
      </section>

      {/* Preview & select */}
      {candidates !== null ? (
        <section className="card p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-[var(--muted)]">
              <span className="font-semibold text-[var(--navy)]">{candidates.length}</span> shown
              {hidden > 0 ? ` · ${hidden} already-imported hidden` : ""} · <span className="font-semibold text-[var(--navy)]">{selected.size}</span> selected
            </p>
            <div className="flex gap-3 text-xs">
              <button className="underline" onClick={() => setSelected(new Set(selectableRefs))} disabled={selectableRefs.length === 0}>Select all</button>
              <button className="underline" onClick={() => setSelected(new Set())} disabled={selected.size === 0}>Clear</button>
            </div>
          </div>

          {candidates.length === 0 ? (
            <p className="py-8 text-center text-sm text-[var(--muted)]">No matching items.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm [&_td]:px-3 [&_td]:py-2 [&_th]:px-3 [&_th]:py-2">
                <thead className="text-left text-xs uppercase tracking-wide text-[var(--muted)]">
                  <tr><th></th><th>Type</th><th>#</th><th>Title</th><th>State</th><th>Labels</th></tr>
                </thead>
                <tbody>
                  {candidates.map((c) => (
                    <tr key={c.externalRef} className="border-t border-[var(--line)]">
                      <td>
                        <input
                          type="checkbox"
                          disabled={c.alreadyImported}
                          checked={selected.has(c.externalRef)}
                          onChange={() => toggle(c.externalRef)}
                        />
                      </td>
                      <td className="text-[var(--muted)]">{c.type}</td>
                      <td className="tabular-nums text-[var(--muted)]">{c.iid}</td>
                      <td>
                        <span className="text-[var(--navy)]">{c.title}</span>
                        {c.alreadyImported ? <span className="chip-neutral ml-2 rounded-full px-2 py-0.5 text-[10px] font-semibold">imported</span> : null}
                      </td>
                      <td className="text-[var(--muted)]">{c.state}</td>
                      <td className="max-w-[14rem] truncate text-xs text-[var(--muted)]">{c.labels.join(", ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-[var(--line)] pt-4">
            <div>
              <label className={lbl}>Default release quarter (optional)</label>
              <select value={quarter} onChange={(e) => setQuarter(e.target.value)} className={field}>
                <option value="">— none —</option>
                {releaseQuarters.map((q) => <option key={q} value={q}>{q}</option>)}
              </select>
            </div>
            <div className="ml-auto flex items-center gap-3">
              {error ? <span className="text-sm text-[var(--danger)]">{error}</span> : null}
              <button className="btn-gold text-sm" onClick={confirm} disabled={pending || selected.size === 0}>
                {pending ? "Queuing…" : `Import ${selected.size} selected →`}
              </button>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
