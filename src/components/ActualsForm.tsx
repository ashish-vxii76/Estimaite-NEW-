"use client";

import { useState } from "react";

export function ActualsForm({
  estimateId,
  actuals,
}: {
  estimateId: string;
  actuals: {
    actualDevPd: number;
    actualQaPd: number;
    actualSprints: number;
    varianceJson: string;
  } | null;
}) {
  const [message, setMessage] = useState("");
  const variance = actuals ? JSON.parse(actuals.varianceJson) : null;

  async function onSubmit(formData: FormData) {
    const res = await fetch(`/api/estimates/${estimateId}/actuals`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        actualDevPd: Number(formData.get("actualDevPd")),
        actualQaPd: Number(formData.get("actualQaPd")),
        actualSprints: Number(formData.get("actualSprints")),
        actualDevResources: Number(formData.get("actualDevResources")),
        actualQaResources: Number(formData.get("actualQaResources")),
        actualOtherCost: Number(formData.get("actualOtherCost") ?? 0),
        completionDate: formData.get("completionDate"),
      }),
    });
    const data = await res.json();
    setMessage(res.ok ? data.variance.interpretation : data.error);
  }

  return (
    <section className="card p-5">
      <h2 className="font-medium">Actuals and calibration</h2>
      <form action={onSubmit} className="mt-4 grid gap-3 md:grid-cols-3">
        {[
          ["actualDevPd", "Actual Dev PD"],
          ["actualQaPd", "Actual QA PD"],
          ["actualSprints", "Actual sprints"],
          ["actualDevResources", "Actual Dev resources"],
          ["actualQaResources", "Actual QA resources"],
          ["actualOtherCost", "Actual other cost"],
        ].map(([name, label]) => (
          <label key={name} className="text-sm">
            {label}
            <input
              name={name}
              type="number"
              min={0}
              step="0.01"
              className="mt-1 w-full rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-3 py-2"
              required
            />
          </label>
        ))}
        <label className="text-sm">
          Completion date
          <input
            name="completionDate"
            type="date"
            className="mt-1 w-full rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-3 py-2"
          />
        </label>
        <div className="md:col-span-3">
          <button className="rounded-lg bg-teal-400 px-4 py-2 text-slate-950">Save actuals</button>
        </div>
      </form>
      {message ? <p className="mt-3 text-sm text-teal-200">{message}</p> : null}
      {variance ? (
        <p className="mt-3 text-sm text-[var(--muted)]">
          Actual/Estimated ratio: {variance.actualEstimatedEffortRatio}. {variance.interpretation}
        </p>
      ) : null}
    </section>
  );
}
