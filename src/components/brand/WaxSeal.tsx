const TONE = {
  gold: { hi: "#f6e2b0", mid: "#d4b06a", lo: "#7a5420" },
  red: { hi: "#f0a3a3", mid: "#b42318", lo: "#5c0c18" },
  green: { hi: "#8ed4b8", mid: "#0f766e", lo: "#064e3b" },
} as const;

function rim(cx: number, cy: number, r: number, n: number, tooth: number) {
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r, tooth };
  });
}

export function WaxSeal({
  label,
  tone,
  stars = false,
  className = "",
}: {
  label: string;
  tone: "gold" | "red" | "green";
  stars?: boolean;
  className?: string;
}) {
  const c = TONE[tone];
  const gid = `wax-${tone}-${label.replace(/\s/g, "")}-${stars ? "s" : "n"}`;
  const bumps = rim(50, 50, 41.2, 24, 7.1);

  return (
    <svg className={`mk-seal ${className}`} viewBox="0 0 100 100" aria-hidden>
      <defs>
        <radialGradient id={`${gid}-g`} cx="34%" cy="28%" r="78%">
          <stop offset="0%" stopColor={c.hi} />
          <stop offset="45%" stopColor={c.mid} />
          <stop offset="100%" stopColor={c.lo} />
        </radialGradient>
        <filter id={`${gid}-t`} x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" seed="4" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="1.4" />
        </filter>
      </defs>
      <g filter={`url(#${gid}-t)`}>
        <circle cx="50" cy="50" r="39.5" fill={`url(#${gid}-g)`} />
        {bumps.map((b, i) => (
          <circle key={i} cx={b.x} cy={b.y} r={b.tooth} fill={`url(#${gid}-g)`} />
        ))}
      </g>
      <ellipse cx="38" cy="34" rx="16" ry="10" fill="rgba(255,255,255,0.22)" />
      <circle cx="50" cy="50" r="29.5" fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="1.15" />
      <circle cx="50" cy="50" r="27.2" fill="none" stroke="rgba(0,0,0,0.16)" strokeWidth="0.7" />
      <text
        x="50"
        y={stars ? 49 : 53.5}
        textAnchor="middle"
        fill="#fff"
        fontSize="7.6"
        fontWeight="800"
        letterSpacing="0.09em"
        style={{ fontFamily: "ui-sans-serif, system-ui, sans-serif" }}
      >
        {label.toUpperCase()}
      </text>
      {stars ? (
        <text x="50" y="61.5" textAnchor="middle" fill="#fff" fontSize="7.4" letterSpacing="0.28em">
          ★★★
        </text>
      ) : null}
    </svg>
  );
}
