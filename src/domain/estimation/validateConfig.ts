import type { EstimationConfig } from "./types";

export type ConfigValidationIssue = { code: string; message: string };

/**
 * Server-side invariants the estimation engine depends on. Governance rule #1:
 * these must be enforced at the boundary (and by the engine), not only in the
 * admin form. `validateConfig` returns the list of violations; `assertValidConfig`
 * throws if any exist, so a bad config can never be persisted or computed against.
 */
export function validateConfig(config: EstimationConfig): ConfigValidationIssue[] {
  const issues: ConfigValidationIssue[] = [];
  const num = (v: unknown) => (typeof v === "number" ? v : Number(v));

  // --- Complexity dimension weights: the spine of the index ---
  const dims = (config.complexityDimensions ?? []).filter((d) => d.active !== false);
  if (dims.length === 0) {
    issues.push({ code: "NO_DIMENSIONS", message: "At least one active complexity dimension is required." });
  }
  const weightSum = dims.reduce((s, d) => s + (num(d.weight) || 0), 0);
  if (dims.length > 0 && Math.abs(weightSum - 1) > 1e-4) {
    issues.push({
      code: "WEIGHT_SUM",
      message: `Active complexity dimension weights must sum to 1.00 (got ${weightSum.toFixed(4)}).`,
    });
  }
  for (const d of dims) {
    if (num(d.weight) < 0) {
      issues.push({ code: "NEGATIVE_WEIGHT", message: `Dimension "${d.id}" has a negative weight.` });
    }
    if (num(d.maxScore) < num(d.minScore)) {
      issues.push({ code: "SCORE_RANGE", message: `Dimension "${d.id}" has maxScore < minScore.` });
    }
  }

  // --- Complexity bands: monotonic, non-overlapping, positive width ---
  const bands = [...(config.complexityBands ?? [])].sort((a, b) => a.minInclusive - b.minInclusive);
  for (let i = 0; i < bands.length; i++) {
    const b = bands[i];
    if (b.maxExclusive <= b.minInclusive) {
      issues.push({ code: "BAND_RANGE", message: `Band ${b.tshirt} has maxExclusive <= minInclusive.` });
    }
    if (i > 0 && b.minInclusive < bands[i - 1].maxExclusive) {
      issues.push({ code: "BAND_OVERLAP", message: `Bands ${bands[i - 1].tshirt} and ${b.tshirt} overlap.` });
    }
  }

  // --- Complexity multipliers must be positive (they scale size and effort) ---
  for (const [k, v] of Object.entries(config.complexityMultipliers ?? {})) {
    if (!(num(v) > 0)) {
      issues.push({ code: "MULTIPLIER", message: `Complexity multiplier for ${k} must be > 0 (got ${v}).` });
    }
  }

  // --- Commercial rates must be non-negative; team sizes positive ---
  for (const r of config.locationDailyRates ?? []) {
    if (num(r.dailyRate) < 0) {
      issues.push({ code: "NEGATIVE_RATE", message: `Location ${r.location} has a negative daily rate.` });
    }
  }
  for (const t of config.teamCostMappings ?? []) {
    if (num(t.resourceSprintCost) < 0 || num(t.teamSprintCost) < 0) {
      issues.push({ code: "NEGATIVE_RATE", message: `Team ${t.teamName} has a negative rate.` });
    }
    if (num(t.standardTeamSize) <= 0) {
      issues.push({ code: "TEAM_SIZE", message: `Team ${t.teamName} standardTeamSize must be > 0.` });
    }
  }
  if (num(config.standardTeamSize) <= 0) {
    issues.push({ code: "STD_TEAM_SIZE", message: "standardTeamSize must be > 0." });
  }

  // --- Definition-of-Ready threshold within range ---
  const criteriaCount = config.readinessCriteria?.length ?? 5;
  const min = config.readinessAssumptionsMin;
  if (min != null && (min < 0 || min > criteriaCount)) {
    issues.push({
      code: "READINESS_MIN",
      message: `readinessAssumptionsMin must be between 0 and ${criteriaCount} (got ${min}).`,
    });
  }

  return issues;
}

export function assertValidConfig(config: EstimationConfig): void {
  const issues = validateConfig(config);
  if (issues.length > 0) {
    throw new Error("Invalid estimation config — " + issues.map((i) => i.message).join(" "));
  }
}
