import { useId } from "react";

const TONE = {
  gold: { a: "#f4e0a8", b: "#d4b06a", c: "#8a6428" },
  red: { a: "#ef9a9a", b: "#c62828", c: "#6b0f1a" },
  green: { a: "#80cbc4", b: "#1b7a5a", c: "#0b3d2e" },
} as const;

function scallops(cx: number, cy: number, r: number, n: number, tooth: number) {
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    return { cx: cx + Math.cos(a) * r, cy: cy + Math.sin(a) * r, r: tooth };
  });
}

export function WaxSeal({
  label,
  stars = false,
  tone,
  className = "",
}: {
  label: string;
  stars?: boolean;
  tone: "gold" | "red" | "green";
  className?: string;
}) {
  const uid = useId().replace(/:/g, "");
  const fill = `lp-wax-${uid}`;
  const colors = TONE[tone];
  const rim = scallops(50, 50, 41.5, 22, 6.4);

  return (
    <svg
      className={`lp-wax ${className}`}
      viewBox="0 0 100 100"
      aria-hidden
      role="img"
    >
      <defs>
        <radialGradient id={fill} cx="32%" cy="28%" r="78%">
          <stop offset="0%" stopColor={colors.a} />
          <stop offset="42%" stopColor={colors.b} />
          <stop offset="100%" stopColor={colors.c} />
        </radialGradient>
      </defs>
      <g filter="drop-shadow(0 8px 10px rgba(10,25,47,0.28))">
        <circle cx="50" cy="50" r="40" fill={`url(#${fill})`} />
        {rim.map((c, i) => (
          <circle key={i} cx={c.cx} cy={c.cy} r={c.r} fill={`url(#${fill})`} />
        ))}
      </g>
      <circle cx="50" cy="50" r="31" fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="1.1" />
      <circle cx="50" cy="50" r="28.5" fill="none" stroke="rgba(0,0,0,0.18)" strokeWidth="0.6" />
      <text
        x="50"
        y={stars ? 48.5 : 53}
        textAnchor="middle"
        fill="#fff"
        fontSize="7.4"
        fontWeight="800"
        letterSpacing="0.08em"
        style={{ fontFamily: "ui-sans-serif, system-ui, sans-serif" }}
      >
        {label.toUpperCase()}
      </text>
      {stars ? (
        <text x="50" y="61" textAnchor="middle" fill="#fff" fontSize="8" letterSpacing="0.22em">
          ★★★
        </text>
      ) : null}
    </svg>
  );
}
