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
  const overrides = config.crewDaysPerPoint?.[crewId];
  if (!overrides || Object.keys(overrides).length === 0) return config;
  return {
    ...config,
    resourceLevels: config.resourceLevels.map((lvl) =>
      overrides[lvl.id] != null ? { ...lvl, daysPerPoint: overrides[lvl.id] } : lvl,
    ),
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
