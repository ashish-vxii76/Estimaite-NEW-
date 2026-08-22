"use client";

import { useRouter } from "next/navigation";
import { DELIVERY_FLAGS } from "@/domain/estimation/portfolio";
import { T_SHIRTS } from "@/domain/estimation/types";

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "DRAFT", label: "Drafts" },
  { value: "READY_FOR_REVIEW", label: "Ready for review" },
  { value: "REVIEWED", label: "Reviewed" },
  { value: "APPROVED", label: "Approved" },
  { value: "COMPLETED", label: "Completed" },
] as const;

export function EstimateFilters({
  quarters,
  status,
  workItemType,
  release,
  tshirt,
  flag,
}: {
  quarters: string[];
  status: string;
  workItemType: string;
  release: string;
  tshirt: string;
  flag: string;
}) {
  const router = useRouter();

  function apply(next: {
    status?: string;
    workItemType?: string;
    release?: string;
    tshirt?: string;
    flag?: string;
  }) {
    const params = new URLSearchParams();
    const s = next.status ?? status;
    const w = next.workItemType ?? workItemType;
    const r = next.release ?? release;
    const t = next.tshirt ?? tshirt;
    const f = next.flag ?? flag;
    if (s) params.set("status", s);
    if (w) params.set("workItemType", w);
    if (r) params.set("release", r);
    if (t) params.set("tshirt", t);
    if (f) params.set("flag", f);
    const qs = params.toString();
    router.push(qs ? `/estimates?${qs}` : "/estimates");
  }

  const selectClass =
    "mt-1 w-full rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-3 py-2 text-sm text-[var(--navy)]";

  return (
    <section className="card grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-4">
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
      <label className="text-sm">
        T-shirt size
        <select
          className={selectClass}
          value={tshirt}
          onChange={(e) => apply({ tshirt: e.target.value })}
        >
          <option value="">All sizes</option>
          {T_SHIRTS.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm">
        Flag
        <select
          className={selectClass}
          value={flag}
          onChange={(e) => apply({ flag: e.target.value })}
        >
          <option value="">All flags</option>
          {DELIVERY_FLAGS.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm md:col-span-2 xl:col-span-4 xl:max-w-xs">
        Status
        <select
          className={selectClass}
          value={status}
          onChange={(e) => apply({ status: e.target.value })}
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value || "all"} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>
    </section>
  );
}
