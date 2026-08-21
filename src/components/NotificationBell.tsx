"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import type { AppNotification } from "@/lib/homeInbox";

export function NotificationBell({ items }: { items: AppNotification[] }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const actionable = items.filter((i) => i.id !== "clear");
  const badge = actionable.length;

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        className="relative rounded-full border border-[var(--line)] bg-[var(--panel)] p-2 text-[var(--navy)] hover:bg-[var(--panel-2)]"
        aria-label="Notifications"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <Bell className="h-5 w-5" />
        {badge > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white">
            {badge > 9 ? "9+" : badge}
          </span>
        ) : null}
      </button>
      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-[min(100vw-2rem,22rem)] overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--panel)] shadow-lg">
          <div className="border-b border-[var(--line)] px-4 py-2 text-sm font-semibold text-[var(--navy)]">
            Notifications
          </div>
          <ul className="max-h-80 overflow-y-auto">
            {items.map((item) => (
              <li key={item.id} className="border-b border-[var(--line)] last:border-0">
                <Link
                  href={item.href}
                  className="block px-4 py-3 hover:bg-[var(--panel-2)]"
                  onClick={() => setOpen(false)}
                >
                  <p
                    className={`text-xs font-semibold uppercase tracking-wide ${
                      item.severity === "urgent"
                        ? "text-rose-700"
                        : item.severity === "warn"
                          ? "text-amber-700"
                          : "text-[var(--muted)]"
                    }`}
                  >
                    {item.title}
                  </p>
                  <p className="mt-1 text-sm text-[var(--text)]">{item.body}</p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
