"use client";

import { useState, useTransition } from "react";
import { testAndSaveConnection, revokeConnection, type ActionResult } from "@/actions/gitlabIntegration";

export function GitLabConnectionForm({
  connected,
  host,
  scopes,
  lastUsedAt,
}: {
  connected: boolean;
  host: string;
  scopes: string;
  lastUsedAt: string | null;
}) {
  const [hostValue, setHostValue] = useState(host);
  const [token, setToken] = useState("");
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, start] = useTransition();

  function save() {
    setResult(null);
    start(async () => {
      const r = await testAndSaveConnection(hostValue, token);
      setResult(r);
      if (r.ok) setToken("");
    });
  }

  function revoke() {
    setResult(null);
    start(async () => setResult(await revokeConnection()));
  }

  return (
    <section className="card max-w-xl p-5">
      <div className="mb-4 flex items-center gap-2 text-sm">
        <span
          className={`inline-block h-2.5 w-2.5 rounded-full ${connected ? "bg-[var(--ok)]" : "bg-[var(--muted)]"}`}
        />
        <span className="font-semibold text-[var(--navy)]">
          {connected ? "Connected" : "Not connected"}
        </span>
        {connected ? (
          <span className="text-[var(--muted)]">
            · {host} · scopes: {scopes || "—"}
            {lastUsedAt ? ` · last used ${new Date(lastUsedAt).toLocaleDateString()}` : ""}
          </span>
        ) : null}
      </div>

      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Host</label>
      <input
        value={hostValue}
        onChange={(e) => setHostValue(e.target.value)}
        className="mb-3 w-full rounded-lg border border-[var(--line)] bg-[var(--panel)] px-3 py-2 text-sm"
        placeholder="gitlab.com"
      />

      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
        Personal access token (read_api)
      </label>
      <input
        type="password"
        value={token}
        onChange={(e) => setToken(e.target.value)}
        autoComplete="off"
        className="w-full rounded-lg border border-[var(--line)] bg-[var(--panel)] px-3 py-2 text-sm font-mono"
        placeholder={connected ? "•••••••• (enter a new token to replace)" : "glpat-…"}
      />
      <p className="mt-1 text-xs text-[var(--muted)]">
        Create a token with only the <code>read_api</code> scope. Write scopes are rejected. Stored
        encrypted; never displayed again.
      </p>

      <div className="mt-4 flex items-center gap-3">
        <button className="btn-gold text-sm" onClick={save} disabled={pending || token.trim().length < 8}>
          {pending ? "Testing…" : connected ? "Test & replace" : "Test & save"}
        </button>
        {connected ? (
          <button className="btn-ghost text-sm" onClick={revoke} disabled={pending}>
            Revoke
          </button>
        ) : null}
      </div>

      {result ? (
        <p className={`mt-3 text-sm ${result.ok ? "text-[var(--ok)]" : "text-[var(--danger)]"}`}>
          {result.message}
        </p>
      ) : null}
    </section>
  );
}
