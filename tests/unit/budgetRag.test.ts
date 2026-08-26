import { describe, expect, it } from "vitest";
import { budgetStatus } from "@/domain/estimation/portfolio";

describe("budgetStatus — integer-cent RAG (#4)", () => {
  it("UNSET when budget is missing or non-positive", () => {
    expect(budgetStatus(100, null).rag).toBe("UNSET");
    expect(budgetStatus(100, 0).rag).toBe("UNSET");
    expect(budgetStatus(100, -5).rag).toBe("UNSET");
  });

  it("GREEN at/under budget, AMBER up to exactly 110%, RED beyond", () => {
    expect(budgetStatus(100, 100).rag).toBe("GREEN"); // exactly on budget
    expect(budgetStatus(105, 100).rag).toBe("AMBER");
    expect(budgetStatus(110, 100).rag).toBe("AMBER"); // exactly 110% → still AMBER
    expect(budgetStatus(110.01, 100).rag).toBe("RED"); // one cent over 110%
  });

  it("boundary at a cent-exact 110% budget is not flipped by float drift", () => {
    // budget * 1.1 lands exactly on a cent here; integer arithmetic keeps it AMBER.
    expect(budgetStatus(110.11, 100.1).rag).toBe("AMBER");
    expect(budgetStatus(110.12, 100.1).rag).toBe("RED");
  });

  it("integer verdict matches the naive float comparison across the realistic range", () => {
    const floatRag = (t: number, b: number) =>
      t <= b ? "GREEN" : t <= b * 1.1 ? "AMBER" : "RED";
    for (let bc = 1; bc <= 20000; bc++) {
      const budget = bc / 100;
      const ceil = Math.floor((bc * 11) / 10); // AMBER ceiling in cents
      for (const tc of [ceil - 1, ceil, ceil + 1, bc, bc - 1]) {
        if (tc < 0) continue;
        expect(budgetStatus(tc / 100, budget).rag).toBe(floatRag(tc / 100, budget));
      }
    }
  });
});
