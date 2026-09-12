"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { processRunAction } from "@/actions/gitlabIntake";

export function ProcessRunButton({ runId, label = "Process now" }: { runId: string; label?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <span className="inline-flex items-center gap-2">
      <button
        className="btn-gold text-xs"
        disabled={pending}
        onClick={() => {
          setMsg(null);
          start(async () => {
            const r = await processRunAction(runId);
            setMsg(r.message);
            router.refresh();
          });
        }}
      >
        {pending ? "Processing…" : label}
      </button>
      {msg ? <span className="text-xs text-[var(--muted)]">{msg}</span> : null}
    </span>
  );
}
