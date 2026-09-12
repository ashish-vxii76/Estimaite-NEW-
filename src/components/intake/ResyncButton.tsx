"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { resyncEstimateAction } from "@/actions/gitlabIntake";

export function ResyncButton({ estimateId }: { estimateId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <span className="inline-flex items-center gap-2">
      <button
        className="btn-ghost text-xs"
        disabled={pending}
        onClick={() => {
          setMsg(null);
          start(async () => {
            const r = await resyncEstimateAction(estimateId);
            setMsg(r.message);
            if (r.ok) router.refresh();
          });
        }}
      >
        {pending ? "Re-syncing…" : "Re-sync from GitLab"}
      </button>
      {msg ? <span className="text-xs text-[var(--muted)]">{msg}</span> : null}
    </span>
  );
}
