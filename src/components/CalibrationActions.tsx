"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CalibrationRow } from "@/domain/estimation/calibration";

export function CalibrationActions({ rows }: { rows: CalibrationRow[] }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const applicable = rows.filter((row) => row.suggestedDaysPerPoint != null);

  async function apply() {
    if (!applicable.length) return;
    const res = await fetch("/api/calibration/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const data = await res.json();
    setMessage(
      res.ok
        ? `Published configuration ${data.config.versionId}. Days/Point updated for sampled levels only.`
        : data.error ?? "Apply failed",
    );
    if (res.ok) router.refresh();
  }

  return (
    <div className="space-y-2">
      <button
        className="rounded-lg bg-teal-400 px-4 py-2 text-slate-950 disabled:opacity-40"
        onClick={apply}
        disabled={!applicable.length}
      >
        Approve and apply suggested Days/Point
      </button>
      <p className="text-xs text-[var(--muted)]">
        Suggestions never apply themselves. This publishes a new configuration version after
        administrator approval.
      </p>
      {message ? <p className="text-sm text-teal-200">{message}</p> : null}
    </div>
  );
}
