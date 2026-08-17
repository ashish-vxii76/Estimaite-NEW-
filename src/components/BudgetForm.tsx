"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function BudgetForm({
  budget,
  currency,
}: {
  budget: number | null;
  currency: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(budget == null ? "" : String(budget));
  const [message, setMessage] = useState("");

  async function save() {
    const res = await fetch("/api/portfolio/budget", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        budget: value === "" ? null : Number(value),
        currency,
      }),
    });
    const data = await res.json();
    setMessage(res.ok ? "Budget saved" : data.error ?? "Save failed");
    if (res.ok) router.refresh();
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <label className="text-sm">
        Portfolio budget ({currency})
        <input
          type="number"
          min={0}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Enter budget"
          className="mt-1 block w-48 rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-3 py-2"
        />
      </label>
      <button className="btn-primary" onClick={save}>
        Set budget
      </button>
      {message ? <p className="text-sm text-[var(--ok)]">{message}</p> : null}
    </div>
  );
}
