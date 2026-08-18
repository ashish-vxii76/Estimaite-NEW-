import { useId } from "react";

const CYAN = "#22D3EE";
const BLUE = "#3B82F6";
const PURPLE = "#7C3AED";
const NAVY = "#0F172A";

export function EstimAIteMark({
  className = "h-12 w-12",
  title = "estimAIte",
}: {
  className?: string;
  title?: string;
}) {
  const id = useId().replace(/:/g, "");
  const g = `estimaite-g-${id}`;
  return (
    <svg viewBox="0 0 128 112" className={className} role="img" aria-label={title}>
      <title>{title}</title>
      <defs>
        <linearGradient id={g} x1="18" y1="8" x2="86" y2="104" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={CYAN} />
          <stop offset="48%" stopColor={BLUE} />
          <stop offset="100%" stopColor={PURPLE} />
        </linearGradient>
      </defs>
      {/* Lowercase e loop */}
      <path
        d="M108 54H38C38 32 54 16 76 16c22 0 36 14 38 32"
        fill="none"
        stroke={`url(#${g})`}
        strokeWidth="14"
        strokeLinecap="round"
      />
      <path
        d="M38 54c0 24 18 42 40 42 16 0 30-10 36-24"
        fill="none"
        stroke={`url(#${g})`}
        strokeWidth="14"
        strokeLinecap="round"
      />
      {/* Crossbar of the e, flowing into motion bars */}
      <path
        d="M36 54h86"
        fill="none"
        stroke={`url(#${g})`}
        strokeWidth="13"
        strokeLinecap="round"
      />
      <path d="M96 28h22" stroke={`url(#${g})`} strokeWidth="11" strokeLinecap="round" />
      <path d="M102 40h16" stroke={`url(#${g})`} strokeWidth="10" strokeLinecap="round" />
      <path d="M108 68h14" stroke={`url(#${g})`} strokeWidth="10" strokeLinecap="round" />
      <path d="M100 81h18" stroke={`url(#${g})`} strokeWidth="10" strokeLinecap="round" />
      {/* Growth chart in the counter */}
      <polyline
        points="50,78 60,72 72,62 84,52"
        fill="none"
        stroke={`url(#${g})`}
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="50" cy="78" r="3.2" fill={`url(#${g})`} />
      <circle cx="60" cy="72" r="3.2" fill={`url(#${g})`} />
      <circle cx="72" cy="62" r="3.2" fill={`url(#${g})`} />
      <path d="M80 56l8-10 1 9-8 2z" fill={`url(#${g})`} />
    </svg>
  );
}

export function EstimAIteWordmark({
  onDark = false,
  className = "",
}: {
  onDark?: boolean;
  className?: string;
}) {
  const ink = onDark ? "#F8FAFC" : NAVY;
  return (
    <span className={`inline-flex items-baseline font-semibold tracking-tight ${className}`}>
      <span style={{ color: ink }}>estim</span>
      <span
        className="bg-clip-text text-transparent"
        style={{ backgroundImage: `linear-gradient(135deg, ${CYAN}, ${BLUE}, ${PURPLE})` }}
      >
        AI
      </span>
      <span style={{ color: ink }}>te</span>
    </span>
  );
}

export function EstimAIteLogo({
  variant = "lockup",
  onDark = false,
  className = "",
}: {
  variant?: "mark" | "nav" | "lockup" | "full" | "stacked";
  onDark?: boolean;
  className?: string;
}) {
  const ink = onDark ? "text-slate-100" : "text-slate-900";
  if (variant === "mark") {
    return <EstimAIteMark className={className || "h-11 w-12"} />;
  }
  if (variant === "stacked") {
    return (
      <div className={`flex flex-col items-center text-center ${className}`}>
        <EstimAIteMark className="h-28 w-32" />
        <EstimAIteWordmark onDark className="mt-5 text-4xl sm:text-5xl" />
        <span
          className="mt-4 h-px w-48"
          style={{ backgroundImage: `linear-gradient(90deg, ${PURPLE}, ${CYAN})` }}
        />
        <p className="mt-3 text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-white">
          AI powered. Agile. Accurate.
        </p>
        <p
          className="mt-3 bg-clip-text text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-transparent"
          style={{ backgroundImage: `linear-gradient(90deg, ${CYAN}, ${BLUE}, ${PURPLE})` }}
        >
          Estimate smarter. Deliver better.
        </p>
      </div>
    );
  }
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <EstimAIteMark className={variant === "full" ? "h-16 w-[4.6rem]" : "h-11 w-12"} />
      <div className="min-w-0">
        <EstimAIteWordmark onDark={onDark} className={variant === "full" ? "text-3xl" : "text-xl"} />
        {variant === "nav" ? null : variant === "full" ? (
          <>
            <p className={`mt-1 flex items-center gap-2 text-[0.62rem] font-semibold uppercase tracking-[0.18em] ${ink}`}>
              <span
                className="h-px w-8"
                style={{ backgroundImage: `linear-gradient(90deg, ${CYAN}, ${PURPLE})` }}
              />
              AI powered. Agile. Accurate.
              <span
                className="h-px w-8"
                style={{ backgroundImage: `linear-gradient(90deg, ${CYAN}, ${PURPLE})` }}
              />
            </p>
            <p className="mt-2 flex flex-wrap items-center gap-2 text-[0.62rem] font-semibold uppercase tracking-[0.14em]">
              <span className="text-sky-500">Estimate smarter.</span>
              <span className={onDark ? "text-white/30" : "text-slate-300"}>|</span>
              <span className="text-violet-600">Deliver better.</span>
            </p>
          </>
        ) : (
          <p className={`text-[0.62rem] font-semibold uppercase tracking-[0.16em] ${onDark ? "text-white/55" : "text-slate-500"}`}>
            AI powered. Agile. Accurate.
          </p>
        )}
      </div>
    </div>
  );
}
