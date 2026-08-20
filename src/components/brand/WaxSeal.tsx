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
  const fill =
    tone === "gold" ? "mk-seal-fill-gold" : tone === "red" ? "mk-seal-fill-red" : "mk-seal-fill-green";

  return (
    <div className={`mk-seal ${fill} ${className}`}>
      <span>
        {label}
        {stars ? <i>★</i> : null}
      </span>
    </div>
  );
}
