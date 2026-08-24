"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CalibrationRow } from "@/domain/estimation/calibration";

export function CalibrationActions({
  rows,
  team = "",
}: {
  rows: CalibrationRow[];
  team?: string;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const applicable = rows.filter((row) => row.suggestedDaysPerPoint != null);

  async function apply() {
    if (!applicable.length) return;
    const res = await fetch("/api/calibration/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ team: team || undefined }),
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
        className="btn-primary disabled:opacity-40"
        onClick={apply}
        disabled={!applicable.length}
      >
        Approve and apply suggested Days/Point
      </button>
      <p className="text-xs text-[var(--muted)]">
        Suggestions never apply themselves. This publishes a new configuration version after
        administrator approval using samples from your locked org path
        {team ? " and selected Pod" : ""}.
      </p>
      {message ? <p className="text-sm text-[var(--ok)]">{message}</p> : null}
    </div>
  );
}
