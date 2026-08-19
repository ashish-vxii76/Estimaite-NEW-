"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { switchProfile } from "@/actions/switchProfile";
import { roleLabel } from "@/lib/roles";

export type ProfileOption = {
  email: string;
  name: string;
  role: string;
  teamName?: string | null;
};

export function ProfileSwitcher({
  currentEmail,
  currentRole,
  profiles,
}: {
  currentEmail?: string | null;
  currentRole?: string | null;
  profiles: ProfileOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const isAdmin = currentRole === "ADMINISTRATOR";

  function onChange(email: string) {
    if (!email || email === currentEmail) return;
    setError("");
    if (!isAdmin) {
      router.push(`/login?profile=${encodeURIComponent(email)}`);
      return;
    }
    startTransition(async () => {
      try {
        await switchProfile(email);
      } catch (e) {
        setError((e as Error).message);
      }
    });
  }

  return (
    <div className="mt-3 space-y-1">
      <label className="block text-[10px] uppercase tracking-wide text-[var(--muted)]">
        Switch profile
      </label>
      <select
        className="w-full rounded-lg border border-[var(--line)] bg-white px-2 py-1.5 text-xs text-[var(--text)]"
        value={currentEmail ?? ""}
        disabled={pending}
        onChange={(e) => onChange(e.target.value)}
      >
        {profiles.map((profile) => (
          <option key={profile.email} value={profile.email}>
            {profile.name} ({roleLabel(profile.role)}
            {profile.teamName ? ` · ${profile.teamName}` : profile.role === "ADMINISTRATOR" ? " · All teams" : ""})
          </option>
        ))}
      </select>
      {isAdmin ? null : (
        <p className="text-[10px] text-[var(--muted)]">Switching signs you in as that profile.</p>
      )}
      {error ? <p className="text-[10px] text-[var(--danger)]">{error}</p> : null}
    </div>
  );
}
