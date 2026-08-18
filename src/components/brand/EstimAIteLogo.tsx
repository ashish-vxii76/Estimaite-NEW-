type LogoTone = "light" | "dark";

const SRC: Record<LogoTone, string> = {
  light: "/brand/estimaite-lockup-light.png",
  dark: "/brand/estimaite-lockup-dark.png",
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
      width={1024}
      height={1024}
      className={className}
    />
  );
}
