"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function NewTeamForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(formData: FormData) {
    setBusy(true);
    setError("");
    const res = await fetch("/api/teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formData.get("name"),
        mappedLocation: formData.get("mappedLocation"),
        currency: formData.get("currency"),
        standardTeamSize: Number(formData.get("standardTeamSize")),
        teamSprintRate: Number(formData.get("teamSprintRate")),
        resourceSprintRate: Number(formData.get("resourceSprintRate")),
      }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Could not create team");
      return;
    }
    router.push("/teams");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-lg space-y-5">
      <div>
        <p className="kicker">Organisation</p>
        <h1 className="text-2xl font-semibold">Create new team</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Adds a delivery team. Roster and rate-card edits stay in Administration.
        </p>
      </div>
      <form className="card grid gap-4 p-5" action={onSubmit}>
        <Field label="Team name">
          <input name="name" required placeholder="Vikings" />
        </Field>
        <Field label="Mapped location">
          <input name="mappedLocation" defaultValue="India" required />
        </Field>
        <Field label="Currency">
          <input name="currency" defaultValue="CHF" required />
        </Field>
        <Field label="Standard team size">
          <input name="standardTeamSize" type="number" min={1} defaultValue={10} required />
        </Field>
        <Field label="Team sprint rate">
          <input name="teamSprintRate" type="number" min={0} defaultValue={25000} required />
        </Field>
        <Field label="Resource sprint rate">
          <input name="resourceSprintRate" type="number" min={0} defaultValue={2500} required />
        </Field>
        {error ? <p className="text-sm text-rose-300">{error}</p> : null}
        <button
          className="btn-primary disabled:opacity-60"
          disabled={busy}
        >
          {busy ? "Creating…" : "Create team"}
        </button>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-[var(--muted)]">{label}</span>
      <div className="[&_input]:w-full [&_input]:rounded-lg [&_input]:border [&_input]:border-[var(--line)] [&_input]:bg-[var(--panel-2)] [&_input]:px-3 [&_input]:py-2">
        {children}
      </div>
    </label>
  );
}
