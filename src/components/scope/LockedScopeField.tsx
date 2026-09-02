/**
 * A scope level that is FIXED by the user's role / RBAC scope. Rendered as a read-only field —
 * deliberately unlike an editable <select>: no chevron, a flat (unraised) fill, muted text and a
 * lock glyph, so it never reads as a dropdown you could open. The colour combination differs from
 * the editable control on purpose (the user's affordance point).
 *
 * Use this ONLY for role/RBAC-locked levels. A level that is merely awaiting its parent in a strict
 * cascade should stay a greyed, disabled <select> — that one WILL become selectable, so the
 * dropdown affordance is correct there.
 */
export function LockedScopeField({
  value,
  title,
  className = "",
}: {
  value: string;
  title?: string;
  className?: string;
}) {
  return (
    <div
      title={title ?? value}
      aria-readonly="true"
      className={`flex items-start justify-between gap-1.5 rounded-lg border border-dashed border-[var(--line)] bg-transparent text-[var(--navy)] ${className}`}
    >
      <span className="min-w-0 break-words leading-snug">{value || "—"}</span>
      <LockGlyph />
    </div>
  );
}

function LockGlyph() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0 opacity-70"
      aria-hidden="true"
    >
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}
