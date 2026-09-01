import type {
  AllowedIssueSpConfig,
  ComplexityBandConfig,
  ComplexityMappingConfig,
  EpicMappingConfig,
  EpicRomMappingConfig,
  EstimationConfig,
  IssueMappingConfig,
  StoryPointMappingConfig,
} from "./types";

// DEC-007 A5 / DEC-011: per-crew applied overrides — pure helpers (no I/O). The service layer supplies
// the crew's approved mapping overrides; this stays I/O-free so it remains golden-testable.

/** DEC-011: the three per-crew mapping tables, as APPROVED override payloads (partial → overlay). */
export type CrewMappingOverrides = {
  ISSUE?: {
    issueMappings?: IssueMappingConfig[];
    issueStoryPointMappings?: StoryPointMappingConfig[];
    allowedIssueStoryPoints?: AllowedIssueSpConfig[];
  };
  EPIC?: {
    epicMappings?: EpicMappingConfig[];
    epicRomMappings?: EpicRomMappingConfig[];
  };
  COMPLEXITY?: {
    complexityMappings?: ComplexityMappingConfig[];
    complexityBands?: ComplexityBandConfig[];
  };
};

/**
 * Resolve a crew's effective config by overlaying its per-crew overrides onto the global config:
 *  - calibrated / manual Days/Point and Capacity/sprint (DEC-007 A5 / DEC-009), from the config blob;
 *  - APPROVED mapping tables (DEC-011), passed in by the service from `CrewMappingOverride`.
 * A crew with no override of any kind (or a null crewId) returns the config UNCHANGED — this is what
 * keeps Golden Case A/B byte-for-byte unchanged.
 */
export function resolveCrewConfig(
  config: EstimationConfig,
  crewId: string | null | undefined,
  mappingOverrides?: CrewMappingOverrides | null,
): EstimationConfig {
  if (!crewId) return config;
  const dpp = config.crewDaysPerPoint?.[crewId];
  const cap = config.crewCapacitySpPerSprint?.[crewId];
  const hasDpp = dpp && Object.keys(dpp).length > 0;
  const hasCap = cap && Object.keys(cap).length > 0;
  const mo = mappingOverrides ?? undefined;
  const hasMapping = !!mo && (!!mo.ISSUE || !!mo.EPIC || !!mo.COMPLEXITY);
  // Nothing overridden → identical config, so undiverged crews behave exactly as today.
  if (!hasDpp && !hasCap && !hasMapping) return config;

  const next: EstimationConfig = { ...config };
  if (hasDpp || hasCap) {
    next.resourceLevels = config.resourceLevels.map((lvl) => {
      const nextDpp = hasDpp && dpp![lvl.id] != null ? dpp![lvl.id] : lvl.daysPerPoint;
      const nextCap = hasCap && cap![lvl.id] != null ? cap![lvl.id] : lvl.capacitySpPerSprint;
      if (nextDpp === lvl.daysPerPoint && nextCap === lvl.capacitySpPerSprint) return lvl;
      return { ...lvl, daysPerPoint: nextDpp, capacitySpPerSprint: nextCap };
    });
  }
  if (mo?.ISSUE) {
    if (mo.ISSUE.issueMappings) next.issueMappings = mo.ISSUE.issueMappings;
    if (mo.ISSUE.issueStoryPointMappings) next.issueStoryPointMappings = mo.ISSUE.issueStoryPointMappings;
    if (mo.ISSUE.allowedIssueStoryPoints) next.allowedIssueStoryPoints = mo.ISSUE.allowedIssueStoryPoints;
  }
  if (mo?.EPIC) {
    if (mo.EPIC.epicMappings) next.epicMappings = mo.EPIC.epicMappings;
    if (mo.EPIC.epicRomMappings) next.epicRomMappings = mo.EPIC.epicRomMappings;
  }
  if (mo?.COMPLEXITY) {
    if (mo.COMPLEXITY.complexityMappings) next.complexityMappings = mo.COMPLEXITY.complexityMappings;
    if (mo.COMPLEXITY.complexityBands) next.complexityBands = mo.COMPLEXITY.complexityBands;
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
