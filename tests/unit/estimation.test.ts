import { describe, expect, it } from "vitest";
import {
  DEFAULT_CONFIG,
  calculateComplexityIndex,
  calculateEstimate,
  calculateRequiredSprints,
  calculateVariance,
  mapIndexToTshirt,
  planDelivery,
  type EstimateCalculationInput,
} from "@/domain/estimation";

function scores(fill: number, overrides: Record<string, number> = {}) {
  return DEFAULT_CONFIG.complexityDimensions.map((d) => ({
    dimensionId: d.id,
    score: overrides[d.id] ?? fill,
  }));
}

function ready(yesCount: number) {
  return ["business", "acceptance", "dependencies", "architecture", "test"].map(
    (criterionId, index) => ({
      criterionId,
      answer: (index < yesCount ? "YES" : "NO") as "YES" | "NO",
    }),
  );
}

function baseInput(partial: Partial<EstimateCalculationInput> = {}): EstimateCalculationInput {
  return {
    workItemType: "ISSUE",
    complexityScores: scores(3),
    readiness: ready(5),
    stance: "NEUTRAL",
    devResourceLevelId: "intermediate",
    qaResourceLevelId: "experienced",
    devAiProductivityPct: 0,
    qaAiProductivityPct: 0,
    planningMode: "RESOURCE_CONSTRAINED",
    availableDev: 1,
    availableQa: 1,
    targetSprints: 2,
    costingModel: "RESOURCE_SPRINT",
    resourceSprintRate: 4000,
    teamSprintRate: 12000,
    otherFixedCost: 0,
    locationAllocations: [
      {
        locationId: "uk",
        locationName: "United Kingdom",
        allocationPct: 100,
        dailyRate: 650,
        currency: "CHF",
      },
    ],
    currency: "CHF",
    ...partial,
  };
}

describe("complexity scoring", () => {
  it("uses round(20 × Σ(score × weight), 0) with weights summing to 1", () => {
    const allFive = calculateComplexityIndex(scores(5), DEFAULT_CONFIG);
    expect(allFive.index).toBe(100);
    const allOne = calculateComplexityIndex(scores(1), DEFAULT_CONFIG);
    expect(allOne.index).toBe(20);
    const caseA = calculateComplexityIndex(scores(4, { functional: 3, data: 3 }), DEFAULT_CONFIG);
    expect(caseA.index).toBe(75);
  });

  it("maps index to inclusive T-shirt bands", () => {
    expect(mapIndexToTshirt(20, DEFAULT_CONFIG)).toBe("XS");
    expect(mapIndexToTshirt(21, DEFAULT_CONFIG)).toBe("S");
    expect(mapIndexToTshirt(36, DEFAULT_CONFIG)).toBe("M");
    expect(mapIndexToTshirt(51, DEFAULT_CONFIG)).toBe("L");
    expect(mapIndexToTshirt(66, DEFAULT_CONFIG)).toBe("XL");
    expect(mapIndexToTshirt(81, DEFAULT_CONFIG)).toBe("XXL");
    expect(mapIndexToTshirt(75, DEFAULT_CONFIG)).toBe("XL");
  });
});

describe("planning", () => {
  it("uses the slower stream and rounds up", () => {
    const result = calculateRequiredSprints({
      devSP: 8,
      qaSP: 5,
      devResources: 1,
      qaResources: 1,
      devCapacity: 3.15,
      qaCapacity: 7.7,
    });
    expect(result.devSprints).toBeCloseTo(2.5397, 3);
    expect(result.qaSprints).toBeCloseTo(0.6494, 3);
    expect(result.finalSprints).toBe(3);
  });
});

describe("calculateEstimate principles", () => {
  it("does not let AI reduce baseline SP", () => {
    const none = calculateEstimate(baseInput({ devAiProductivityPct: 0 }), DEFAULT_CONFIG);
    const ai = calculateEstimate(baseInput({ devAiProductivityPct: 0.1 }), DEFAULT_CONFIG);
    expect(ai.baselineSp).toBe(none.baselineSp);
    expect(ai.selectedSp).toBe(none.selectedSp);
    expect(ai.aiAdjustedDevCapacity).toBeCloseTo(none.devCapacity * 1.1);
  });

  it("keeps Dev SP + QA SP = Total SP", () => {
    const result = calculateEstimate(baseInput(), DEFAULT_CONFIG);
    expect(result.devSp + result.qaSp).toBeCloseTo(result.selectedSp, 6);
  });

  it("does not change SP when commercial rates change", () => {
    const a = calculateEstimate(baseInput({ resourceSprintRate: 1000 }), DEFAULT_CONFIG);
    const b = calculateEstimate(baseInput({ resourceSprintRate: 9000 }), DEFAULT_CONFIG);
    expect(a.selectedSp).toBe(b.selectedSp);
    expect(a.effectiveTshirt).toBe(b.effectiveTshirt);
    expect(a.adjustedTotalEffortPd).toBe(b.adjustedTotalEffortPd);
    expect(a.baselineDeliveryCost).not.toBe(b.baselineDeliveryCost);
  });

  it("applies stance by shifting one T-shirt", () => {
    const neutral = calculateEstimate(baseInput({ stance: "NEUTRAL" }), DEFAULT_CONFIG);
    const opt = calculateEstimate(baseInput({ stance: "OPTIMISTIC" }), DEFAULT_CONFIG);
    const pes = calculateEstimate(baseInput({ stance: "PESSIMISTIC" }), DEFAULT_CONFIG);
    expect(opt.effectiveTshirt).not.toBe(pes.effectiveTshirt);
    expect(neutral.assessedTshirt).toBe(opt.assessedTshirt);
  });

  it("retains automated SP when override is applied", () => {
    const result = calculateEstimate(
      baseInput({ overrideEnabled: true, overrideSp: 13 }),
      DEFAULT_CONFIG,
    );
    expect(result.baselineSp).toBe(8);
    expect(result.selectedSp).toBe(13);
  });

  it("never prorates the selected resource-sprint rate by utilisation", () => {
    const result = calculateEstimate(
      baseInput({
        availableDev: 1,
        availableQa: 1,
      }),
      DEFAULT_CONFIG,
    );
    expect(result.utilisation).toBe(20);
    expect(result.selectedRate).toBe(4000);
    expect(result.baselineDeliveryCost).toBe(
      result.plannedResources * result.finalSprints * result.selectedRate,
    );
  });

  it("flags discovery when readiness is low", () => {
    const result = calculateEstimate(baseInput({ readiness: ready(0) }), DEFAULT_CONFIG);
    expect(result.dorStatus).toBe("Discovery Required");
    expect(result.governanceDecision).toBe("DISCOVERY REQUIRED");
    expect(result.confidence).toBe("Low");
  });

  it("defers commercial cost on epics", () => {
    const result = calculateEstimate(
      baseInput({
        workItemType: "EPIC",
        complexityScores: scores(4, { applications: 3 }),
      }),
      DEFAULT_CONFIG,
    );
    expect(result.assessedTshirt).toBe("XL");
    expect(result.selectedSp).toBe(120);
    expect(result.baselineDeliveryCost).toBeNull();
    expect(result.aiAdjustedDeliveryCost).toBeNull();
    expect(result.costApplicability).toContain("COST DEFERRED");
  });
});

describe("portfolio roll-up", () => {
  it("aggregates register cost, effort, flags and T-shirt cost", async () => {
    const { rollupPortfolio } = await import("@/domain/estimation/portfolio");
    const result = rollupPortfolio(
      [
        {
          governanceDecision: "READY",
          deliveryFlag: "READY",
          effectiveTshirt: "M",
          aiAdjustedDeliveryCost: 9361,
          baselineDeliveryCost: 10000,
          adjustedTotalEffortPd: 100,
        },
        {
          governanceDecision: "SPLIT",
          deliveryFlag: "SPLIT",
          effectiveTshirt: "XL",
          aiAdjustedDeliveryCost: 5000,
          baselineDeliveryCost: 5000,
          adjustedTotalEffortPd: 200,
        },
        {
          governanceDecision: "DECOMPOSE",
          deliveryFlag: "DECOMPOSE",
          effectiveTshirt: "XL",
          aiAdjustedDeliveryCost: null,
          baselineDeliveryCost: null,
          adjustedTotalEffortPd: 67.2,
        },
      ],
      20000,
    );
    expect(result.totalEstimates).toBe(3);
    expect(result.totalAiAdjustedCost).toBe(14361);
    expect(result.totalBaselineCost).toBe(15000);
    expect(result.totalEffortPd).toBe(367.2);
    expect(result.countByFlag.READY).toBe(1);
    expect(result.countByFlag.SPLIT).toBe(1);
    expect(result.countByFlag.DECOMPOSE).toBe(1);
    expect(result.costByTshirt.M).toBe(9361);
    expect(result.costByTshirt.XL).toBe(5000);
    expect(result.budgetRag).toBe("GREEN");
  });

  it("marks AMBER when total is within 10% over budget", async () => {
    const { budgetStatus } = await import("@/domain/estimation/portfolio");
    expect(budgetStatus(100, 100).rag).toBe("GREEN");
    expect(budgetStatus(105, 100).rag).toBe("AMBER");
    expect(budgetStatus(111, 100).rag).toBe("RED");
  });
});

describe("days/point calibration (DEC-007 A1: effort-weighted ratio-of-sums)", () => {
  it("single sample: suggested = current × (Σ actual ÷ Σ estimated)", async () => {
    const { calibrateDaysPerPoint } = await import("@/domain/estimation/calibration");
    const result = calibrateDaysPerPoint({
      levels: [
        { id: "beginner", name: "Beginner", daysPerPoint: 3.33 },
        { id: "intermediate", name: "Intermediate", daysPerPoint: 2 },
      ],
      // ratio 2.14 = 32.1 / 15. With one sample, ratio-of-sums == the single CR ratio,
      // so this matches the pre-A1 expectation exactly (backward-consistent).
      samples: [{ resourceLevelId: "beginner", actualEffortPd: 32.1, estimatedEffortPd: 15 }],
    });
    expect(result.rows[0]?.avgActualEstRatio).toBe(2.14);
    expect(result.rows[0]?.suggestedDaysPerPoint).toBe(7.13);
    expect(result.rows[0]?.samples).toBe(1);
    expect(result.rows[1]?.samples).toBe(0);
    expect(result.rows[1]?.suggestedDaysPerPoint).toBeNull();
    expect(result.overallAvgRatio).toBe(2.14);
  });

  it("multi-sample: weights by effort (ratio-of-sums), not an unweighted mean of ratios", async () => {
    const { calibrateDaysPerPoint } = await import("@/domain/estimation/calibration");
    const result = calibrateDaysPerPoint({
      levels: [{ id: "intermediate", name: "Intermediate", daysPerPoint: 2 }],
      samples: [
        { resourceLevelId: "intermediate", actualEffortPd: 4, estimatedEffortPd: 2 }, // ratio 2.0
        { resourceLevelId: "intermediate", actualEffortPd: 110, estimatedEffortPd: 100 }, // ratio 1.1
      ],
    });
    // ratio-of-sums = (4+110)/(2+100) = 114/102 = 1.1176 → 1.12.
    // (An unweighted mean of the per-CR ratios would give (2.0+1.1)/2 = 1.55 — rejected.)
    expect(result.rows[0]?.avgActualEstRatio).toBe(1.12);
    expect(result.rows[0]?.suggestedDaysPerPoint).toBe(2.24); // round2(2 × 1.12)
    expect(result.rows[0]?.samples).toBe(2);
    expect(result.overallAvgRatio).toBe(1.12);
  });
});

describe("calibration shrinkage (DEC-007 A2: k=8, n_min=8, walk all real levels)", () => {
  it("below n_min: inherits the parent unchanged (no crew-specific calibration)", async () => {
    const { calibrateWithShrinkage } = await import("@/domain/estimation/calibration");
    // crew has 5 samples (< 8) → do not calibrate; inherit the parent's 1.05.
    const r = calibrateWithShrinkage({ ratio: 1.8, n: 5 }, [{ ratio: 1.05, n: 50 }]);
    expect(r.inherited).toBe(true);
    expect(r.ratioUsed).toBe(1.05);
    expect(r.parentRatio).toBe(1.05);
  });

  it("at n_min: 50/50 blend with the parent (n = k = 8)", async () => {
    const { calibrateWithShrinkage } = await import("@/domain/estimation/calibration");
    // (8·2.0 + 8·1.0) / (8+8) = 24/16 = 1.5 — exactly halfway.
    const r = calibrateWithShrinkage({ ratio: 2.0, n: 8 }, [{ ratio: 1.0, n: 100 }]);
    expect(r.inherited).toBe(false);
    expect(r.ratioUsed).toBe(1.5);
  });

  it("above n_min: own data dominates (24 samples → 75% own weight)", async () => {
    const { calibrateWithShrinkage } = await import("@/domain/estimation/calibration");
    // (24·2.0 + 8·1.0) / (24+8) = 56/32 = 1.75.
    const r = calibrateWithShrinkage({ ratio: 2.0, n: 24 }, [{ ratio: 1.0, n: 100 }]);
    expect(r.inherited).toBe(false);
    expect(r.ratioUsed).toBe(1.75);
  });

  it("walks the chain: skips a thin/empty ancestor to the nearest qualifying one", async () => {
    const { calibrateWithShrinkage } = await import("@/domain/estimation/calibration");
    // crew n=3 (inherit). Ancestors nearest→farthest:
    //   stream (empty) → sub-division (n=20, qualifies) → division (n=100).
    // Nearest qualifying = sub-division 1.3.
    const r = calibrateWithShrinkage({ ratio: 1.9, n: 3 }, [
      { ratio: null, n: 0 }, // stream
      { ratio: 1.3, n: 20 }, // sub-division
      { ratio: 1.1, n: 100 }, // division
    ]);
    expect(r.inherited).toBe(true);
    expect(r.parentRatio).toBe(1.3);
    expect(r.ratioUsed).toBe(1.3);
  });

  it("terminal fallback: no ancestor qualifies → global baseline 1.0 (no change)", async () => {
    const { calibrateWithShrinkage, resolveParentRatio } = await import(
      "@/domain/estimation/calibration"
    );
    const thin = [
      { ratio: 1.5, n: 1 },
      { ratio: null, n: 0 },
      { ratio: 2.0, n: 4 },
    ];
    expect(resolveParentRatio(thin)).toBe(1); // none meets n_min=8
    // crew also thin → inherit → 1.0 (keep current Days/Point).
    const r = calibrateWithShrinkage({ ratio: 1.5, n: 2 }, thin);
    expect(r.inherited).toBe(true);
    expect(r.ratioUsed).toBe(1);
  });

  it("qualifying cell shrinks toward the nearest qualifying ancestor, not the global baseline", async () => {
    const { calibrateWithShrinkage } = await import("@/domain/estimation/calibration");
    // crew qualifies (n=8); nearest qualifying ancestor is the stream (n=12, ratio 1.2).
    // (8·2.0 + 8·1.2)/16 = 25.6/16 = 1.6.
    const r = calibrateWithShrinkage({ ratio: 2.0, n: 8 }, [
      { ratio: 1.2, n: 12 }, // stream qualifies
      { ratio: 1.0, n: 500 }, // company (ignored — stream is nearer & qualifies)
    ]);
    expect(r.parentRatio).toBe(1.2);
    expect(r.ratioUsed).toBe(1.6);
  });
});

describe("calibration eligibility + outlier damping (DEC-007 A3)", () => {
  const LEVELS = [{ id: "intermediate", name: "Intermediate", daysPerPoint: 2 }];

  it("min_size: excludes CRs under 2 PD estimated, keeps CRs at/over the floor", async () => {
    const { calibrateDaysPerPoint } = await import("@/domain/estimation/calibration");
    const result = calibrateDaysPerPoint({
      levels: LEVELS,
      samples: [
        { resourceLevelId: "intermediate", actualEffortPd: 10, estimatedEffortPd: 1 }, // < 2 PD → excluded
        { resourceLevelId: "intermediate", actualEffortPd: 12, estimatedEffortPd: 10 }, // eligible → ratio 1.2
      ],
    });
    expect(result.rows[0]?.samples).toBe(1); // only the eligible CR counted
    expect(result.rows[0]?.avgActualEstRatio).toBe(1.2);
    expect(result.overallAvgRatio).toBe(1.2);
  });

  it("min_size boundary: exactly 2 PD is eligible", async () => {
    const { calibrateDaysPerPoint } = await import("@/domain/estimation/calibration");
    const result = calibrateDaysPerPoint({
      levels: LEVELS,
      samples: [{ resourceLevelId: "intermediate", actualEffortPd: 4, estimatedEffortPd: 2 }],
    });
    expect(result.rows[0]?.samples).toBe(1);
    expect(result.rows[0]?.avgActualEstRatio).toBe(2); // 4/2, within clamp range
  });

  it("clamps a high outlier ratio to the cap (5.0 → 3.0)", async () => {
    const { calibrateDaysPerPoint } = await import("@/domain/estimation/calibration");
    // raw 50/10 = 5.0 → clamped 3.0 → adjusted actual 30 → ratio 30/10 = 3.0
    const result = calibrateDaysPerPoint({
      levels: LEVELS,
      samples: [{ resourceLevelId: "intermediate", actualEffortPd: 50, estimatedEffortPd: 10 }],
    });
    expect(result.rows[0]?.avgActualEstRatio).toBe(3);
    expect(result.rows[0]?.suggestedDaysPerPoint).toBe(6); // round2(2 × 3.0)
  });

  it("clamps a low outlier ratio to the floor (0.1 → 0.33)", async () => {
    const { calibrateDaysPerPoint } = await import("@/domain/estimation/calibration");
    // raw 1/10 = 0.1 → clamped 0.33 → adjusted actual 3.3 → ratio 3.3/10 = 0.33
    const result = calibrateDaysPerPoint({
      levels: LEVELS,
      samples: [{ resourceLevelId: "intermediate", actualEffortPd: 1, estimatedEffortPd: 10 }],
    });
    expect(result.rows[0]?.avgActualEstRatio).toBe(0.33);
  });

  it("clamp boundaries (exactly 3.0 and 0.33) pass through unchanged", async () => {
    const { calibrateDaysPerPoint } = await import("@/domain/estimation/calibration");
    const cap = calibrateDaysPerPoint({
      levels: LEVELS,
      samples: [{ resourceLevelId: "intermediate", actualEffortPd: 30, estimatedEffortPd: 10 }], // 3.0
    });
    expect(cap.rows[0]?.avgActualEstRatio).toBe(3);
    const floor = calibrateDaysPerPoint({
      levels: LEVELS,
      samples: [{ resourceLevelId: "intermediate", actualEffortPd: 33, estimatedEffortPd: 100 }], // 0.33
    });
    expect(floor.rows[0]?.avgActualEstRatio).toBe(0.33);
  });

  it("aggregate: clamping caps a mis-scoped CR's influence on the effort-weighted ratio", async () => {
    const { calibrateDaysPerPoint } = await import("@/domain/estimation/calibration");
    // CR1 raw 20/2 = 10 → clamp 3.0 → adjusted 6.  CR2 raw 110/100 = 1.1 → adjusted 110.
    // ratio = (6 + 110) / (2 + 100) = 116/102 = 1.1373 → 1.14
    // (Un-clamped would be (20+110)/(2+100) = 130/102 = 1.27 — the outlier is damped.)
    const result = calibrateDaysPerPoint({
      levels: LEVELS,
      samples: [
        { resourceLevelId: "intermediate", actualEffortPd: 20, estimatedEffortPd: 2 },
        { resourceLevelId: "intermediate", actualEffortPd: 110, estimatedEffortPd: 100 },
      ],
    });
    expect(result.rows[0]?.avgActualEstRatio).toBe(1.14);
    expect(result.rows[0]?.samples).toBe(2);
  });
});

describe("calibration recency window (DEC-007 A4: W=12mo, basis = finalisedAt)", () => {
  const NOW = new Date("2026-08-29T00:00:00.000Z");

  it("inside the window is eligible", async () => {
    const { isWithinCalibrationWindow } = await import("@/domain/estimation/calibration");
    expect(isWithinCalibrationWindow(new Date("2026-05-29T00:00:00.000Z"), NOW)).toBe(true);
  });

  it("exactly on the 12-month boundary is eligible (inclusive)", async () => {
    const { isWithinCalibrationWindow } = await import("@/domain/estimation/calibration");
    // now − 12 months = 2025-08-29.
    expect(isWithinCalibrationWindow(new Date("2025-08-29T00:00:00.000Z"), NOW)).toBe(true);
  });

  it("just outside the window is excluded", async () => {
    const { isWithinCalibrationWindow } = await import("@/domain/estimation/calibration");
    expect(isWithinCalibrationWindow(new Date("2025-08-28T23:59:59.000Z"), NOW)).toBe(false);
    expect(isWithinCalibrationWindow(new Date("2025-02-01T00:00:00.000Z"), NOW)).toBe(false);
  });

  it("null finalisedAt is never eligible (no inference from other timestamps)", async () => {
    const { isWithinCalibrationWindow } = await import("@/domain/estimation/calibration");
    expect(isWithinCalibrationWindow(null, NOW)).toBe(false);
    expect(isWithinCalibrationWindow(undefined, NOW)).toBe(false);
  });

  it("boundary is timezone/DST independent (UTC calendar arithmetic)", async () => {
    const { isWithinCalibrationWindow } = await import("@/domain/estimation/calibration");
    const original = process.env.TZ;
    // `now` sits a week after the US spring-forward; cutoff is exactly 12 UTC months earlier.
    const nowNearDst = new Date("2026-03-15T00:30:00.000Z");
    const onBoundary = new Date("2025-03-15T00:30:00.000Z"); // == cutoff → inclusive
    const justBefore = new Date("2025-03-15T00:29:59.999Z"); // 1 ms before → excluded
    try {
      for (const tz of ["UTC", "America/New_York", "Asia/Kolkata", "Pacific/Kiritimati"]) {
        process.env.TZ = tz;
        expect(isWithinCalibrationWindow(onBoundary, nowNearDst)).toBe(true);
        expect(isWithinCalibrationWindow(justBefore, nowNearDst)).toBe(false);
      }
    } finally {
      process.env.TZ = original;
    }
  });

  it("insufficient in-window history flows to A2 inheritance (no window expansion)", async () => {
    const { isWithinCalibrationWindow, calibrateWithShrinkage } = await import(
      "@/domain/estimation/calibration"
    );
    // 10 finalised dates; only 3 fall inside the 12-month window.
    const dates = [
      "2026-08-01", "2026-06-15", "2026-01-10", // inside (3)
      "2025-06-01", "2025-03-01", "2024-12-01", "2024-08-01",
      "2024-01-01", "2023-06-01", "2022-12-01", // outside (7)
    ].map((d) => new Date(`${d}T00:00:00.000Z`));
    const inWindow = dates.filter((d) => isWithinCalibrationWindow(d, NOW));
    expect(inWindow.length).toBe(3); // older 7 are NOT pulled in

    // 3 < n_min (8) → A2 inherits the parent unchanged, rather than widening the window.
    const r = calibrateWithShrinkage({ ratio: 1.9, n: inWindow.length }, [{ ratio: 1.1, n: 40 }]);
    expect(r.inherited).toBe(true);
    expect(r.ratioUsed).toBe(1.1);
  });
});

describe("calibration quality indicator (DEC-007 A6: n / bias / dispersion)", () => {
  const LEVELS = [{ id: "intermediate", name: "Intermediate", daysPerPoint: 2 }];

  it("consistent samples → low CV, not flagged", async () => {
    const { calibrateDaysPerPoint } = await import("@/domain/estimation/calibration");
    const result = calibrateDaysPerPoint({
      levels: LEVELS,
      samples: [
        { resourceLevelId: "intermediate", actualEffortPd: 10.5, estimatedEffortPd: 10 }, // 1.05
        { resourceLevelId: "intermediate", actualEffortPd: 20, estimatedEffortPd: 20 }, // 1.00
        { resourceLevelId: "intermediate", actualEffortPd: 9.5, estimatedEffortPd: 10 }, // 0.95
      ],
    });
    const row = result.rows[0]!;
    expect(row.dispersionCv).not.toBeNull();
    expect(row.dispersionCv!).toBeLessThan(0.5);
    expect(row.lowConfidence).toBe(false);
  });

  it("scattered samples → high CV, flagged low-confidence", async () => {
    const { calibrateDaysPerPoint } = await import("@/domain/estimation/calibration");
    const result = calibrateDaysPerPoint({
      levels: LEVELS,
      samples: [
        { resourceLevelId: "intermediate", actualEffortPd: 3, estimatedEffortPd: 10 }, // 0.30 → clamp 0.33
        { resourceLevelId: "intermediate", actualEffortPd: 30, estimatedEffortPd: 10 }, // 3.0
        { resourceLevelId: "intermediate", actualEffortPd: 10, estimatedEffortPd: 10 }, // 1.0
      ],
    });
    const row = result.rows[0]!;
    expect(row.dispersionCv!).toBeGreaterThan(0.5);
    expect(row.lowConfidence).toBe(true);
  });

  it("single sample → CV null (dispersion undefined), not flagged", async () => {
    const { calibrateDaysPerPoint } = await import("@/domain/estimation/calibration");
    const result = calibrateDaysPerPoint({
      levels: LEVELS,
      samples: [{ resourceLevelId: "intermediate", actualEffortPd: 12, estimatedEffortPd: 10 }],
    });
    expect(result.rows[0]!.dispersionCv).toBeNull();
    expect(result.rows[0]!.lowConfidence).toBe(false);
  });
});

describe("per-crew calibration resolution + guardrail (DEC-007 A5)", () => {
  it("no override (or null crew) returns the config unchanged — golden-safe", async () => {
    const { resolveCrewConfig } = await import("@/domain/estimation/crewCalibration");
    const { DEFAULT_CONFIG } = await import("@/domain/estimation");
    expect(resolveCrewConfig(DEFAULT_CONFIG, null)).toBe(DEFAULT_CONFIG);
    expect(resolveCrewConfig(DEFAULT_CONFIG, "crew-with-no-override")).toBe(DEFAULT_CONFIG);
  });

  it("overlays only the crew's overridden levels; others keep the global default", async () => {
    const { resolveCrewConfig } = await import("@/domain/estimation/crewCalibration");
    const { DEFAULT_CONFIG } = await import("@/domain/estimation");
    const cfg = { ...DEFAULT_CONFIG, crewDaysPerPoint: { crewX: { senior: 1.5 } } };
    const resolved = resolveCrewConfig(cfg, "crewX");
    const senior = resolved.resourceLevels.find((l) => l.id === "senior");
    const beginner = resolved.resourceLevels.find((l) => l.id === "beginner");
    expect(senior?.daysPerPoint).toBe(1.5); // overridden
    expect(beginner?.daysPerPoint).toBe(
      DEFAULT_CONFIG.resourceLevels.find((l) => l.id === "beginner")?.daysPerPoint,
    ); // untouched
  });

  it("guardrail: within ±20% passes; beyond fails; boundary inclusive", async () => {
    const { withinCalibrationGuardrail } = await import("@/domain/estimation/crewCalibration");
    expect(withinCalibrationGuardrail(2.0, 2.2)).toBe(true); // +10%
    expect(withinCalibrationGuardrail(2.0, 2.4)).toBe(true); // +20% boundary
    expect(withinCalibrationGuardrail(2.0, 1.6)).toBe(true); // -20% boundary
    expect(withinCalibrationGuardrail(2.0, 2.5)).toBe(false); // +25%
    expect(withinCalibrationGuardrail(2.0, 1.4)).toBe(false); // -30%
  });
});

describe("per-crew mapping override resolution (DEC-011)", () => {
  it("no mapping override → config unchanged (golden-safe)", async () => {
    const { resolveCrewConfig } = await import("@/domain/estimation/crewCalibration");
    const { DEFAULT_CONFIG } = await import("@/domain/estimation");
    expect(resolveCrewConfig(DEFAULT_CONFIG, "crewX", {})).toBe(DEFAULT_CONFIG);
    expect(resolveCrewConfig(DEFAULT_CONFIG, "crewX", null)).toBe(DEFAULT_CONFIG);
    expect(resolveCrewConfig(DEFAULT_CONFIG, "crewX", undefined)).toBe(DEFAULT_CONFIG);
  });

  it("overlays only the supplied mapping tables; others keep global", async () => {
    const { resolveCrewConfig } = await import("@/domain/estimation/crewCalibration");
    const { DEFAULT_CONFIG } = await import("@/domain/estimation");
    const customIssue = DEFAULT_CONFIG.issueMappings.map((m) => ({ ...m, totalPd: m.totalPd + 1 }));
    const resolved = resolveCrewConfig(DEFAULT_CONFIG, "crewX", { issueMappings: customIssue });
    expect(resolved.issueMappings).toBe(customIssue); // ISSUE overridden
    expect(resolved.epicMappings).toBe(DEFAULT_CONFIG.epicMappings); // EPIC untouched
    expect(resolved.complexityMappings).toBe(DEFAULT_CONFIG.complexityMappings); // COMPLEXITY untouched
    expect(resolved.complexityDimensions).toBe(DEFAULT_CONFIG.complexityDimensions); // dimensions never per-crew
  });

  it("mapping override coexists with Days/Point override", async () => {
    const { resolveCrewConfig } = await import("@/domain/estimation/crewCalibration");
    const { DEFAULT_CONFIG } = await import("@/domain/estimation");
    const cfg = { ...DEFAULT_CONFIG, crewDaysPerPoint: { crewX: { senior: 1.5 } } };
    const customBands = DEFAULT_CONFIG.complexityBands.map((b) => ({ ...b }));
    const resolved = resolveCrewConfig(cfg, "crewX", { complexityBands: customBands });
    expect(resolved.resourceLevels.find((l) => l.id === "senior")?.daysPerPoint).toBe(1.5);
    expect(resolved.complexityBands).toBe(customBands);
  });

  it("resource-levels override sets the table; calibration Days/Point overlays on top", async () => {
    const { resolveCrewConfig } = await import("@/domain/estimation/crewCalibration");
    const { DEFAULT_CONFIG } = await import("@/domain/estimation");
    // Crew override replaces the resource-level table (bump every capacity, base Days/Point = 9)…
    const customLevels = DEFAULT_CONFIG.resourceLevels.map((l) => ({
      ...l,
      capacitySpPerSprint: l.capacitySpPerSprint + 5,
      daysPerPoint: 9,
    }));
    // …while calibration has tuned Days/Point for one level.
    const cfg = { ...DEFAULT_CONFIG, crewDaysPerPoint: { crewX: { senior: 1.5 } } };
    const resolved = resolveCrewConfig(cfg, "crewX", { resourceLevels: customLevels });
    const senior = resolved.resourceLevels.find((l) => l.id === "senior");
    const other = resolved.resourceLevels.find((l) => l.id !== "senior");
    const seniorGlobalCap = DEFAULT_CONFIG.resourceLevels.find((l) => l.id === "senior")!.capacitySpPerSprint;
    expect(senior?.capacitySpPerSprint).toBe(seniorGlobalCap + 5); // capacity from the override table
    expect(senior?.daysPerPoint).toBe(1.5); // calibration tunes Days/Point on top of the override
    expect(other?.daysPerPoint).toBe(9); // uncalibrated level keeps the override's base
  });
});

describe("variance", () => {
  it("interprets actual/estimated ratio", () => {
    const under = calculateVariance({
      actualDevPd: 12,
      actualQaPd: 8,
      actualSprints: 3,
      actualCost: 12000,
      estimatedDevPd: 10,
      estimatedQaPd: 5,
      estimatedSprints: 2,
      estimatedCost: 10000,
    });
    expect(under.actualEstimatedEffortRatio).toBeCloseTo(20 / 15);
    expect(under.interpretation).toContain("Underestimated");
  });
});

describe("sprint-constrained capacity (PRD §6.5 — AI-adjusted)", () => {
  it("sizes required resources on AI-ADJUSTED capacity, per §6.5", () => {
    // §6.5: req_dev = max(1, roundup(dev_sp / (target_sprints × ai_dev_capacity))).
    // AI doubles capacity (base 5 -> AI 10): AI sizing needs 1 Dev / 1 QA.
    // (Base sizing would have given 2 Dev — that is NOT what the PRD specifies.)
    const plan = planDelivery({
      mode: "SPRINT_CONSTRAINED",
      devSP: 20,
      qaSP: 10,
      availableDev: 99, // ignored in sprint-constrained
      availableQa: 99,
      targetSprints: 2,
      baseDevCapacity: 5,
      baseQaCapacity: 5,
      aiDevCapacity: 10,
      aiQaCapacity: 10,
    });
    expect(plan.requiredDev).toBe(1); // max(1, ROUNDUP(20 / (2 × 10 AI)))
    expect(plan.requiredQa).toBe(1); // max(1, ROUNDUP(10 / (2 × 10 AI)))
    expect(plan.plannedDev).toBe(1);
    expect(plan.plannedQa).toBe(1);
  });

  it("derives elapsed sprints from AI-adjusted capacity too (§6.5)", () => {
    const plan = planDelivery({
      mode: "SPRINT_CONSTRAINED",
      devSP: 20,
      qaSP: 10,
      availableDev: 99,
      availableQa: 99,
      targetSprints: 2,
      baseDevCapacity: 5,
      baseQaCapacity: 5,
      aiDevCapacity: 10,
      aiQaCapacity: 10,
    });
    // calculated_sprints = roundup(max(20/(1×10), 10/(1×10))) = roundup(2) = 2
    expect(plan.finalSprints).toBe(2);
  });
});
