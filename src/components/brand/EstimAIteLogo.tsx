type LogoTone = "light" | "dark";

const SRC: Record<LogoTone, string> = {
  light: `/brand/${encodeURIComponent("EstimAIte-header.png")}`,
  dark: `/brand/${encodeURIComponent("EstimAIte -Black.png")}`,
};

const ALT = "estimAIte";

export function EstimAIteLogo({
  tone = "light",
  className = "h-20 w-auto object-contain",
}: {
  tone?: LogoTone;
  className?: string;
}) {
  return (
    <img
      src={SRC[tone]}
      alt={ALT}
      width={1254}
      height={1254}
      className={className}
    />
  );
}
