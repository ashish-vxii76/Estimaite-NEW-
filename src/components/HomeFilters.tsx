"use client";

import { useRouter } from "next/navigation";

type Option = { value: string; label: string };

export function HomeFilters({
  teams,
  quarters,
  team,
  workItemType,
  release,
}: {
  teams: Option[];
  quarters: string[];
  team: string;
  workItemType: string;
  release: string;
}) {
  const router = useRouter();

  function apply(next: { team?: string; workItemType?: string; release?: string }) {
    const params = new URLSearchParams();
    const t = next.team ?? team;
    const w = next.workItemType ?? workItemType;
    const r = next.release ?? release;
    if (t) params.set("team", t);
    if (w) params.set("workItemType", w);
    if (r) params.set("release", r);
    const qs = params.toString();
    router.push(qs ? `/home?${qs}` : "/home");
  }

  const selectClass =
    "mt-1 w-full rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-3 py-2 text-sm text-[var(--navy)]";

  return (
    <section className="card grid gap-4 p-5 md:grid-cols-3">
      <label className="text-sm">
        Team
        <select
          className={selectClass}
          value={team}
          onChange={(e) => apply({ team: e.target.value })}
        >
          <option value="">All teams</option>
          {teams.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm">
        Work type
        <select
          className={selectClass}
          value={workItemType}
          onChange={(e) => apply({ workItemType: e.target.value })}
        >
          <option value="">All work types</option>
          <option value="ISSUE">Issue / Story</option>
          <option value="EPIC">Epic</option>
        </select>
      </label>
      <label className="text-sm">
        Release quarter
        <select
          className={selectClass}
          value={release}
          onChange={(e) => apply({ release: e.target.value })}
        >
          <option value="">All quarters</option>
          {quarters.map((q) => (
            <option key={q} value={q}>
              {q}
            </option>
          ))}
        </select>
      </label>
    </section>
  );
}
