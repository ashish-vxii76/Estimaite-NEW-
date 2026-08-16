import { T_SHIRTS, type EstimateStance, type TShirt } from "./types";

export function shiftTshirt(tshirt: TShirt, delta: number): TShirt {
  const idx = T_SHIRTS.indexOf(tshirt);
  const next = Math.min(T_SHIRTS.length - 1, Math.max(0, idx + delta));
  return T_SHIRTS[next];
}

export function applyStance(assessed: TShirt, stance: EstimateStance): TShirt {
  if (stance === "OPTIMISTIC") return shiftTshirt(assessed, -1);
  if (stance === "PESSIMISTIC") return shiftTshirt(assessed, 1);
  return assessed;
}
