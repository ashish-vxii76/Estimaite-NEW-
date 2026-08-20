import React from "react";

export type WaxSealVariant = "gold" | "green" | "red";

export type WaxSealSize = "small" | "medium" | "large" | "xl";

interface WaxSealProps {
  variant: WaxSealVariant;
  size?: WaxSealSize;
  className?: string;
  ariaLabel?: string;
  decorative?: boolean;
}

const sealAssets: Record<WaxSealVariant, string> = {
  gold: "/assets/seals/gold-governed.png",
  green: "/assets/seals/green-governed.png",
  red: "/assets/seals/red-rejected.png",
};

const sealLabels: Record<WaxSealVariant, string> = {
  gold: "Governed",
  green: "Governed",
  red: "Rejected",
};

/**
 * Reusable wax seal.
 *
 * Assets:
 * /public/assets/seals/gold-governed.png
 * /public/assets/seals/green-governed.png
 * /public/assets/seals/red-rejected.png
 */
export default function WaxSeal({
  variant,
  size = "large",
  className = "",
  ariaLabel,
  decorative = false,
}: WaxSealProps) {
  const classes = ["wax-seal", `wax-seal-${variant}`, `wax-seal-${size}`, className]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={classes}
      aria-label={decorative ? undefined : (ariaLabel ?? `${sealLabels[variant]} wax seal`)}
      aria-hidden={decorative || undefined}
      role={decorative ? undefined : "img"}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={sealAssets[variant]} alt="" draggable={false} loading="eager" />
    </div>
  );
}
