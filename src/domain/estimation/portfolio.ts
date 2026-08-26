import { round2 } from "./math";
import { T_SHIRTS, type TShirt } from "./types";

export const DELIVERY_FLAGS = [
  "READY",
  "REVIEW",
  "SPLIT",
  "PLAN",
  "DECOMPOSE",
  "SPLIT EPIC",
  "SPIKE REQUIRED",
  "DISCOVERY REQUIRED",
] as const;

export type PortfolioRegisterItem = {
  governanceDecision: string;
  deliveryFlag?: string;
  effectiveTshirt: string;
  aiAdjustedDeliveryCost: number | null;
  baselineDeliveryCost: number | null;
  adjustedTotalEffortPd: number;
};

export type BudgetRag = "UNSET" | "GREEN" | "AMBER" | "RED";

export function budgetStatus(
  totalAiAdjustedCost: number,
  budget: number | null | undefined,
): { rag: BudgetRag; label: string } {
  if (budget == null || !Number.isFinite(budget) || budget <= 0) {
    return { rag: "UNSET", label: "set budget" };
  }
  // #4 integer money: compare in exact integer cents so IEEE-754 drift in `budget * 1.1`
  // can never flip the RAG light at a cent boundary. Cross-multiply for the 110% threshold
  // (total <= budget * 1.1  <=>  totalCents * 10 <= budgetCents * 11) to keep it integer-only.
  const totalCents = Math.round(totalAiAdjustedCost * 100);
  const budgetCents = Math.round(budget * 100);
  if (totalCents <= budgetCents) {
    return { rag: "GREEN", label: "On budget" };
  }
  if (totalCents * 10 <= budgetCents * 11) {
    return { rag: "AMBER", label: "Watch" };
  }
  return { rag: "RED", label: "Over budget" };
}

export function rollupPortfolio(
  items: PortfolioRegisterItem[],
  budget: number | null | undefined,
) {
  const countByFlag = Object.fromEntries(DELIVERY_FLAGS.map((f) => [f, 0])) as Record<
    string,
    number
  >;
  const costByTshirt = Object.fromEntries(T_SHIRTS.map((t) => [t, 0])) as Record<TShirt, number>;

  let totalAiAdjustedCost = 0;
  let totalBaselineCost = 0;
  let totalEffortPd = 0;

  for (const item of items) {
    totalAiAdjustedCost += item.aiAdjustedDeliveryCost || 0;
    totalBaselineCost += item.baselineDeliveryCost || 0;
    totalEffortPd += item.adjustedTotalEffortPd || 0;
    const flag = item.deliveryFlag || item.governanceDecision || "READY";
    countByFlag[flag] = (countByFlag[flag] ?? 0) + 1;
    const tshirt = item.effectiveTshirt as TShirt;
    if (tshirt in costByTshirt) {
      costByTshirt[tshirt] = round2(costByTshirt[tshirt] + (item.aiAdjustedDeliveryCost || 0));
    }
  }

  const status = budgetStatus(totalAiAdjustedCost, budget);

  return {
    totalEstimates: items.length,
    totalAiAdjustedCost: round2(totalAiAdjustedCost),
    totalBaselineCost: round2(totalBaselineCost),
    totalEffortPd: round2(totalEffortPd),
    budget: budget ?? null,
    budgetRag: status.rag,
    budgetLabel: status.label,
    countByFlag,
    costByTshirt,
  };
}
