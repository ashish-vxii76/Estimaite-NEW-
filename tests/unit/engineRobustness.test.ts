import { describe, expect, it } from "vitest";
import { DEFAULT_CONFIG, mapIndexToTshirt, uncertaintyTier, applyStance } from "@/domain/estimation";

// PRD inclusive bands: 0–20 XS, 21–35 S, 36–50 M, 51–65 L, 66–80 XL, 81–100 XXL
function prdBand(i: number): string {
  if (i <= 20) return "XS";
  if (i <= 35) return "S";
  if (i <= 50) return "M";
  if (i <= 65) return "L";
  if (i <= 80) return "XL";
  return "XXL";
}

describe("complexity band mapping — full range consistency (#10)", () => {
  it("maps every index 0..100 to the PRD-inclusive band", () => {
    for (let i = 0; i <= 100; i++) {
      expect(mapIndexToTshirt(i, DEFAULT_CONFIG), `index ${i}`).toBe(prdBand(i));
    }
  });

  it("holds exactly at each band boundary", () => {
    const edges: Array<[number, string]> = [
      [20, "XS"], [21, "S"], [35, "S"], [36, "M"], [50, "M"],
      [51, "L"], [65, "L"], [66, "XL"], [80, "XL"], [81, "XXL"], [100, "XXL"],
    ];
    for (const [i, t] of edges) expect(mapIndexToTshirt(i, DEFAULT_CONFIG), `index ${i}`).toBe(t);
  });
});

describe("stance shift bounds (#10)", () => {
  it("shifts one T-shirt and clamps at the ends", () => {
    expect(applyStance("M", "NEUTRAL")).toBe("M");
    expect(applyStance("M", "OPTIMISTIC")).toBe("S");
    expect(applyStance("M", "PESSIMISTIC")).toBe("L");
    expect(applyStance("XS", "OPTIMISTIC")).toBe("XS"); // clamped low
    expect(applyStance("XXL", "PESSIMISTIC")).toBe("XXL"); // clamped high
  });
});

describe("uncertainty → tier mapping is pinned (guards option-text coupling)", () => {
  it("keeps the intended score→tier mapping for DEFAULT_CONFIG", () => {
    const tiers = [1, 2, 3, 4, 5].map((s) => uncertaintyTier(s, DEFAULT_CONFIG));
    expect(tiers).toEqual([4, 4, 3, 2, 1]); // clear/minor → 4 … discovery → 1
  });
});
