import { describe, expect, it } from "vitest";
import { DEFAULT_CONFIG, validateConfig, assertValidConfig } from "@/domain/estimation";

function clone() {
  return JSON.parse(JSON.stringify(DEFAULT_CONFIG)) as typeof DEFAULT_CONFIG;
}

describe("validateConfig (governance #1 + adversarial config #12)", () => {
  it("accepts the shipped DEFAULT_CONFIG", () => {
    expect(validateConfig(DEFAULT_CONFIG)).toEqual([]);
    expect(() => assertValidConfig(DEFAULT_CONFIG)).not.toThrow();
  });

  it("rejects active dimension weights that do not sum to 1.00", () => {
    const cfg = clone();
    cfg.complexityDimensions[0].weight += 0.2;
    const issues = validateConfig(cfg);
    expect(issues.map((i) => i.code)).toContain("WEIGHT_SUM");
    expect(() => assertValidConfig(cfg)).toThrow(/sum to 1\.00/);
  });

  it("rejects a negative dimension weight", () => {
    const cfg = clone();
    const i = cfg.complexityDimensions.findIndex((d) => d.active !== false);
    cfg.complexityDimensions[i].weight = -0.1;
    expect(validateConfig(cfg).map((x) => x.code)).toContain("NEGATIVE_WEIGHT");
  });

  it("rejects a non-positive complexity multiplier", () => {
    const cfg = clone();
    const key = Object.keys(cfg.complexityMultipliers)[0] as keyof typeof cfg.complexityMultipliers;
    cfg.complexityMultipliers[key] = 0;
    expect(validateConfig(cfg).map((x) => x.code)).toContain("MULTIPLIER");
  });

  it("rejects a negative commercial rate", () => {
    const cfg = clone();
    if (cfg.teamCostMappings?.length) {
      cfg.teamCostMappings[0].resourceSprintCost = -1;
      expect(validateConfig(cfg).map((x) => x.code)).toContain("NEGATIVE_RATE");
    }
    if (cfg.locationDailyRates?.length) {
      const cfg2 = clone();
      cfg2.locationDailyRates[0].dailyRate = -1;
      expect(validateConfig(cfg2).map((x) => x.code)).toContain("NEGATIVE_RATE");
    }
  });

  it("rejects a non-positive standard team size", () => {
    const cfg = clone();
    cfg.standardTeamSize = 0;
    expect(validateConfig(cfg).map((x) => x.code)).toContain("STD_TEAM_SIZE");
  });

  it("rejects overlapping complexity bands", () => {
    const cfg = clone();
    if (cfg.complexityBands.length >= 2) {
      const sorted = [...cfg.complexityBands].sort((a, b) => a.minInclusive - b.minInclusive);
      // make the second band start before the first ends
      const target = cfg.complexityBands.find((b) => b.tshirt === sorted[1].tshirt)!;
      target.minInclusive = sorted[0].minInclusive - 1;
      expect(validateConfig(cfg).map((x) => x.code)).toContain("BAND_OVERLAP");
    }
  });
});
