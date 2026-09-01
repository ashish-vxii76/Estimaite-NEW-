import type { EstimationConfig } from "./types";

// DEC-007 A5: per-crew applied calibration — pure helpers (no I/O).

/**
 * Resolve a crew's effective config by overlaying its calibrated Days/Point onto the global
 * resourceLevels: daysPerPoint = crewOverride(crewId, level) ?? globalDefault(level).
 * A crew with no override (or a null crewId) returns the config UNCHANGED, so uncalibrated crews
 * behave exactly as today — this is what keeps Golden Case A/B unchanged.
 */
export function resolveCrewConfig(
  config: EstimationConfig,
  crewId: string | null | undefined,
): EstimationConfig {
  if (!crewId) return config;
  const dpp = config.crewDaysPerPoint?.[crewId];
  const cap = config.crewCapacitySpPerSprint?.[crewId];
  const hasDpp = dpp && Object.keys(dpp).length > 0;
  const hasCap = cap && Object.keys(cap).length > 0;
  // No override of either kind → identical config, so uncalibrated crews behave exactly as today
  // (this is what keeps Golden Case A/B unchanged).
  if (!hasDpp && !hasCap) return config;
  return {
    ...config,
    resourceLevels: config.resourceLevels.map((lvl) => {
      const nextDpp = hasDpp && dpp![lvl.id] != null ? dpp![lvl.id] : lvl.daysPerPoint;
      const nextCap = hasCap && cap![lvl.id] != null ? cap![lvl.id] : lvl.capacitySpPerSprint;
      if (nextDpp === lvl.daysPerPoint && nextCap === lvl.capacitySpPerSprint) return lvl;
      return { ...lvl, daysPerPoint: nextDpp, capacitySpPerSprint: nextCap };
    }),
  };
}

/** DEC-007 A5: max Days/Point move per Apply (normal). Larger requires an authorised override. */
export const CALIBRATION_MAX_STEP = 0.2;

/**
 * True when moving `current` → `suggested` is within ±maxStep. Used to gate an Apply; a move beyond
 * the guardrail needs an explicit authorised override (D5/A5).
 */
export function withinCalibrationGuardrail(
  current: number,
  suggested: number,
  maxStep: number = CALIBRATION_MAX_STEP,
): boolean {
  if (current <= 0) return true;
  return Math.abs(suggested / current - 1) <= maxStep + 1e-9;
}
