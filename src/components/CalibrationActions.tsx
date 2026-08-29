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
    if (!res.ok) {
      setMessage(data.error ?? "Apply failed");
      return;
    }
    // DEC-007 A5: per-crew apply. `config` present only when at least one level was applied.
    if (data.config) {
      const blocked = data.blockedByGuardrail?.length
        ? ` ${data.blockedByGuardrail.length} level(s) exceeded the ±20% guardrail and were held.`
        : "";
      setMessage(
        `Published configuration ${data.config.versionId} — crew Days/Point updated for ${data.applied.length} level(s).${blocked}`,
      );
      router.refresh();
    } else {
      setMessage(data.message ?? "Nothing applied.");
    }
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
        Suggestions never apply themselves. This publishes a new configuration version writing a
        per-crew Days/Point override (shrunk toward org parents), moves capped at ±20% per apply
        unless authorised{team ? " · scoped to the selected Pod's crew" : ""}.
      </p>
      {message ? <p className="text-sm text-[var(--ok)]">{message}</p> : null}
    </div>
  );
}
