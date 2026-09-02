import type { EstimationConfig } from "./types";

// DEC-007 A5 / DEC-011 / DEC-013: per-crew applied overrides — pure helpers (no I/O). The service
// layer supplies the crew's approved override fields; this stays I/O-free so it remains golden-testable.

/**
 * DEC-013: a crew's APPROVED overrides, already merged into the config fields they replace (mapping
 * tables, rate tables, and Class-A estimation-config scalars). An empty object → nothing overridden.
 * Only whitelisted fields ever reach here — the service builds it from governed override payloads.
 */
export type CrewConfigOverrides = Partial<EstimationConfig>;

/**
 * Resolve a crew's effective config by overlaying its per-crew overrides onto the global config:
 *  - calibrated / manual Days/Point and Capacity/sprint (DEC-007 A5 / DEC-009), from the config blob;
 *  - APPROVED override fields (DEC-011 mappings + DEC-013 rates/config), passed in by the service.
 * A crew with no override of any kind (or a null crewId) returns the config UNCHANGED — this is what
 * keeps Golden Case A/B byte-for-byte unchanged.
 */
export function resolveCrewConfig(
  config: EstimationConfig,
  crewId: string | null | undefined,
  overrideFields?: CrewConfigOverrides | null,
): EstimationConfig {
  if (!crewId) return config;
  const dpp = config.crewDaysPerPoint?.[crewId];
  const cap = config.crewCapacitySpPerSprint?.[crewId];
  const hasDpp = dpp && Object.keys(dpp).length > 0;
  const hasCap = cap && Object.keys(cap).length > 0;
  const fields = overrideFields ?? undefined;
  const hasFields = !!fields && Object.keys(fields).length > 0;
  // Nothing overridden → identical config, so undiverged crews behave exactly as today.
  if (!hasDpp && !hasCap && !hasFields) return config;

  const next: EstimationConfig = { ...config };
  // 1) Overlay the approved override fields first (arrays replaced wholesale, scalars replaced) — this
  //    is where a RESOURCE_LEVELS override replaces the crew's resource-level table. The service only
  //    ever includes governed-safe fields here.
  if (hasFields) Object.assign(next, fields);
  // 2) Then the calibrated / manual Days/Point & Capacity overlay applies ON TOP of the (possibly
  //    overridden) levels, so calibration (DEC-007) keeps tuning Days/Point over any table override.
  if (hasDpp || hasCap) {
    next.resourceLevels = next.resourceLevels.map((lvl) => {
      const nextDpp = hasDpp && dpp![lvl.id] != null ? dpp![lvl.id] : lvl.daysPerPoint;
      const nextCap = hasCap && cap![lvl.id] != null ? cap![lvl.id] : lvl.capacitySpPerSprint;
      if (nextDpp === lvl.daysPerPoint && nextCap === lvl.capacitySpPerSprint) return lvl;
      return { ...lvl, daysPerPoint: nextDpp, capacitySpPerSprint: nextCap };
    });
  }
  return next;
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
