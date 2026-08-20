type LogoTone = "light" | "dark";

const SRC: Record<LogoTone, string> = {
  light: `/brand/${encodeURIComponent("EstimAIte - Transparent.PNG")}`,
  // Transparent cutout of the black lockup for navy/dark surfaces
  dark: "/brand/EstimAIte-on-dark.png",
};

const SIZE: Record<LogoTone, { width: number; height: number }> = {
  light: { width: 1037, height: 669 },
  dark: { width: 1254, height: 1254 },
};

const ALT = "estimAIte";

export function EstimAIteLogo({
  tone = "light",
  className = "h-20 w-auto object-contain",
}: {
  tone?: LogoTone;
  className?: string;
}) {
  const size = SIZE[tone];
  return (
    <img
      src={SRC[tone]}
      alt={ALT}
      width={size.width}
      height={size.height}
      className={className}
    />
  );
}
