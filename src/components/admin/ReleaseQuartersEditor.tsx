"use client";

import { useState } from "react";

export function ReleaseQuartersEditor({
  quarters,
  readOnly = false,
}: {
  quarters: string[];
  readOnly?: boolean;
}) {
  const [text, setText] = useState(quarters.join("\n"));
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function save() {
    const releaseQuarters = text
      .split("\n")
      .map((q) => q.trim())
      .filter(Boolean);
    if (!releaseQuarters.length) {
      setMessage("Add at least one release quarter.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section: "releaseQuarters", releaseQuarters }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Save failed");
      setMessage(`Saved configuration ${json.config.versionId}`);
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Release quarters</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          One per line as <code className="text-xs">YYYY-Qn</code> (e.g. 2026-Q1). Ready step
          asks for Year first, then Quarter from this catalogue. Home / Estimates filters match.
        </p>
      </div>
      <section className="card space-y-3 p-5">
        <textarea
          rows={10}
          className="w-full rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-3 py-2 font-mono text-sm"
          value={text}
          disabled={readOnly}
          onChange={(e) => setText(e.target.value)}
        />
      </section>
      {readOnly ? (
        <p className="text-sm text-[var(--muted)]">Read only for this role.</p>
      ) : (
        <button className="btn-primary" type="button" disabled={busy} onClick={save}>
          {busy ? "Saving…" : "Save and publish version"}
        </button>
      )}
      {message ? (
        <p className={`text-sm ${message.startsWith("Saved") ? "text-[var(--ok)]" : "text-[var(--danger)]"}`}>
          {message}
        </p>
      ) : null}
    </div>
  );
}
